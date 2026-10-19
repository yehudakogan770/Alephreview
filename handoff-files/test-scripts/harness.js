
// ---- stand-in Firestore kept in Node, shared by every browser ----
const DB = {};
let seq = 0;
const INC = '__inc__', TS = '__ts__';
function merge(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === 'object' && v[INC] !== undefined) out[k] = (out[k] || 0) + v[INC];
    else if (v === TS) out[k] = Date.now();
    else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = merge(out[k], v);
    else out[k] = v;
  }
  return out;
}
function allowed(user, op, path, data) {
  // mirrors the Firestore rules
  const email = user && user.email;
  const full = ['owner@example.org'].includes(email);
  const sub = !!DB['editors/' + email];
  const admin = full || sub;
  const [col, id] = path.split('/');
  if (col === 'site') return op === 'read' || admin;
  if (col === 'admin') return id === 'owner' ? full : admin;
  if (col === 'editors') return op === 'read' ? admin : full;
  if (col === 'classes') return admin;
  if (col === 'homework') return op === 'read' ? admin || (DB[path] && (DB[path].students || []).includes(email)) : admin;
  if (col === 'progress') {
    if (op === 'read') return admin || !DB[path] || DB[path].email === email;
    return !!email && data.email === email && id === data.hw + '__' + email;
  }
  return false;
}
async function db(user, op, a, b, c) {
  const deny = { error: 'permission-denied' };
  if (op === 'get') { if (!allowed(user, 'read', a)) return deny; return { data: DB[a] || null }; }
  if (op === 'list') {
    const [col, field, oper, val] = a;
    let rows = Object.entries(DB).filter(([p]) => p.startsWith(col + '/')).map(([p, d]) => ({ id: p.split('/')[1], data: d }));
    if (field) rows = rows.filter(r => oper === 'array-contains' ? (r.data[field] || []).includes(val) : r.data[field] === val);
    if (rows.some(r => !allowed(user, 'read', col + '/' + r.id))) return deny;
    if (!field && col === 'homework' && !allowed(user, 'write', 'homework/x')) return deny;
    return { rows };
  }
  if (op === 'set') { const next = c ? merge(DB[a], b) : merge({}, b); if (!allowed(user, 'write', a, next)) return deny; DB[a] = next; return {}; }
  if (op === 'update') { const next = merge(DB[a], b); if (!allowed(user, 'write', a, next)) return deny; DB[a] = next; return {}; }
  if (op === 'delete') { if (!allowed(user, 'write', a, {})) return deny; delete DB[a]; return {}; }
  if (op === 'newid') return { id: 'id' + (++seq) };
}
const FAKE = {
  'firebase-app.js': `export function initializeApp(c){ return {}; }`,
  'firebase-auth.js': `
    export function getAuth(){ return { get currentUser(){ return window.__user; } }; }
    export class GoogleAuthProvider { setCustomParameters(){} }
    const cbs=[]; export function onAuthStateChanged(a, f){ cbs.push(f); setTimeout(()=>f(window.__user), 30); return ()=>{ const i=cbs.indexOf(f); if(i>=0) cbs.splice(i,1); }; }
    export async function signInWithPopup(){ window.__user = window.__next; cbs.slice().forEach(f=>f(window.__user)); return {user: window.__user}; }
    export async function signOut(){ window.__user = null; cbs.slice().forEach(f=>f(null)); }`,
  'firebase-firestore.js': `
    const call = async (...a) => { const r = await window.__db(window.__user, ...a); if (r && r.error) { const e = new Error(r.error); e.code = r.error; throw e; } return r; };
    export function getFirestore(){ return {}; }
    export function collection(db, name){ return { col: name }; }
    export function doc(db, ...p){ if (db && db.col) { const id = 'n' + Math.random().toString(36).slice(2, 8); return { path: db.col + '/' + id, id }; } return { path: p.join('/'), id: p[p.length-1] }; }
    export function query(c, w){ return { col: c.col, w }; }
    export function where(f, o, v){ return [f, o, v]; }
    export async function getDoc(r){ const x = await call('get', r.path); return { id: r.id, exists: () => !!x.data, data: () => x.data }; }
    export async function getDocs(q){ const w = q.w || []; const x = await call('list', [q.col, ...w]); return { docs: x.rows.map(r => ({ id: r.id, data: () => r.data })) }; }
    export async function setDoc(r, d, o){ await call('set', r.path, d, !!(o && o.merge)); }
    export async function deleteDoc(r){ await call('delete', r.path); }
    export function writeBatch(){ const ops = []; return { set(r, d){ ops.push(['set', r.path, d, false]); }, update(r, d){ ops.push(['update', r.path, d]); }, async commit(){ for (const o of ops) await call(...o); } }; }
    export function increment(n){ return { ${INC}: n }; }
    export function serverTimestamp(){ return '${TS}'; }`,
};
async function browser(b, user, next) {
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
  await ctx.exposeFunction('__db', db);
  await ctx.addInitScript(([u, n]) => { window.__user = u; window.__next = n; }, [user, next]);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: FAKE[r.request().url().split('/').pop()] }));
  await ctx.route('https://firestore.googleapis.com/**', r => r.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' }, body: '{}' }));
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.accept());
  return p;
}

module.exports = { DB, browser };
