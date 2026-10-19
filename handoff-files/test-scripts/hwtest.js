const { chromium } = require('playwright');
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
const B = 'http://localhost:8783/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' }, args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });

  // 0. Games play without signing in
  let anon = await browser(b, null, null);
  await anon.goto(B + '#/red/1/play/94191495'); await anon.waitForTimeout(1500);
  console.log('0 no sign-in: game iframe:', await anon.locator('.player iframe').count(), '| homework button:', await anon.isVisible('.homework-link'));
  await anon.goto(B + '#/homework'); await anon.waitForTimeout(800);
  console.log('0 no sign-in homework page:', (await anon.textContent('.hw-signin p')));
  await anon.screenshot({ path: 'hw-signin.png' });
  await anon.context().close();

  // 1. Full admin imports teachers, makes a class and homework
  const t = await browser(b, { email: 'owner@example.org', displayName: 'Rabbi K' });
  await t.goto(B + 'admin.html'); await t.waitForTimeout(1800);
  await t.click('[data-tab=admins]'); await t.waitForTimeout(300);
  await t.fill('#add-admin textarea', 'Name,Email\nMrs A,Teacher.One@School.org\nMr B,teacher.two@gmail.com, owner@example.org');
  await t.click('#add-admin button[type=submit]'); await t.waitForTimeout(400);
  console.log('1 bulk add admins:', await t.$$eval('.admin-email', l => l.map(x => x.textContent)), '|', await t.textContent('#toast'));
  await t.click('[data-tab=homework]'); await t.waitForTimeout(400);
  await t.click('[data-class-new]');
  await t.fill('#dlg-hw input[name=name]', 'Grade 2');
  await t.fill('#dlg-hw textarea[name=students]', 'dov@school.org\nSara@School.org, leah@school.org');
  await t.dispatchEvent('#dlg-hw textarea[name=students]', 'input');
  console.log('2 class email count:', await t.textContent('#dlg-hw [data-count]'));
  await t.click('#dlg-hw [data-act=save]'); await t.waitForTimeout(400);
  console.log('2 classes:', await t.$$eval('#class-list .admin-email', l => l.map(x => x.textContent)));
  await t.click('[data-hw-new]'); await t.waitForTimeout(200);
  await t.fill('#dlg-hw input[name=title]', 'Kamatz practice');
  await t.fill('#dlg-hw input[name=due]', '2026-10-01');
  for (const q of ['whack', 'balloon pop']) { await t.fill('#dlg-hw [data-search]', q); await t.dispatchEvent('#dlg-hw [data-search]', 'input'); await t.click('#dlg-hw [data-pick] >> nth=0'); }
  await t.fill('#dlg-hw [data-assign="0"]', 'https://wordwall.net/play/62269/918/477'); await t.dispatchEvent('#dlg-hw [data-assign="0"]', 'input');
  await t.screenshot({ path: 'hw-new.png' });
  await t.click('#dlg-hw [data-act=save]'); await t.waitForTimeout(400);
  console.log('3 homework rows:', await t.$$eval('#hw-list tbody tr', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim())), '|', await t.textContent('#toast'));
  const hw = Object.entries(DB).find(([p]) => p.startsWith('homework/'));
  console.log('3 stored homework:', JSON.stringify({ ...hw[1], updatedAt: undefined }));

  // 2. Student sees and plays homework
  const s = await browser(b, null, { email: 'sara@school.org', displayName: 'Sara Cohen' });
  await s.goto(B + '#/homework'); await s.waitForTimeout(800);
  await s.click('[data-hw-signin]'); await s.waitForTimeout(1200);
  console.log('4 student list:', await s.$$eval('.hw-card h2', l => l.map(x => x.textContent)), '| due:', await s.textContent('.hw-due'), '| games:', await s.$$eval('.hw-name', l => l.map(x => x.textContent)));
  await s.screenshot({ path: 'hw-list.png' });
  await s.click('.hw-game >> nth=0'); await s.waitForTimeout(2500);
  console.log('5 play: iframe src:', await s.getAttribute('.player iframe', 'src'), '| name hint:', await s.textContent('.hw-name-hint'));
  await s.screenshot({ path: 'hw-play.png' });
  await s.evaluate(() => { clearInterval(hwTimer); }); // speed up: save time directly
  await s.evaluate(async () => { const { db, fsMod } = await cloud(); const u = await currentUser(); await fsMod.setDoc(fsMod.doc(db, 'progress', location.hash.split('/')[2] + '__' + u.email), { hw: location.hash.split('/')[2], email: u.email, name: u.displayName, items: { [location.hash.split('/')[3]]: { seconds: fsMod.increment(150) } } }, { merge: true }); });
  await s.click('text=Next game'); await s.waitForTimeout(1500);
  console.log('6 second game (no assign link) src:', await s.getAttribute('.player iframe', 'src'), '| hint shown:', await s.locator('.hw-name-hint').count());
  await s.goto(B + '#/homework'); await s.waitForTimeout(1200);
  console.log('7 list done marks:', await s.$$eval('.hw-state', l => l.map(x => x.textContent.trim())), '| progress:', await s.textContent('.hw-card .progress-label'));
  // a student not in the class
  const o = await browser(b, { email: 'other@school.org' });
  await o.goto(B + '#/homework'); await o.waitForTimeout(1200);
  console.log('8 other student:', await o.textContent('.hw-note'));
  // student can't open admin
  await s.goto(B + 'admin.html'); await s.waitForTimeout(1200);
  console.log('9 student on admin page:', await s.textContent('#gate-msg'));

  // 3. Teacher sees results
  await t.click('[data-hw-results] >> nth=0'); await t.waitForTimeout(800);
  console.log('10 results:', await t.$$eval('#dlg-hw tbody tr', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim())));
  console.log('10 summary:', await t.textContent('#dlg-hw p.muted'));
  await t.screenshot({ path: 'hw-results.png' });
  console.log('errors:', anon.errs, t.errs, s.errs, o.errs);
  await b.close();
})();
