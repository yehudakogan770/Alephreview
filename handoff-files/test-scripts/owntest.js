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
const B = 'http://localhost:8784/';
// Play one round of the matching game in `p`. mistakes: how many wrong drops to make first.
async function playMatch(p, mistakes) {
  // Match up: place every tile (swap two when mistakes > 0), submit, continue.
  for (let r = 0; r < 5; r++) {
    const boxes = await p.$$('.og-box');
    if (!boxes.length) break;
    const targets = await Promise.all(boxes.map(x => x.getAttribute('data-target')));
    for (let k = 0; k < boxes.length; k++) {
      let want = targets[k];
      if (mistakes > 0 && k === 0) want = targets[1];
      if (mistakes > 0 && k === 1) want = targets[0];
      await (await p.$(`.og-bank .og-tile[data-tile="${want}"]`)).click(); await boxes[k].click(); await p.waitForTimeout(80);
    }
    mistakes = 0;
    await p.click('[data-submit]'); await p.waitForTimeout(400);
    await p.click('[data-continue]'); await p.waitForTimeout(700);
    if (await p.$('.og-end')) break;
  }
}
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const t = await browser(b, { email: 'owner@example.org', displayName: 'Rabbi K' });
  await t.goto(B + 'admin.html'); await t.waitForTimeout(1800);
  // 1. make a matching game with pasted pairs (8 pairs -> 2 rounds)
  await t.click('[data-make="1"]'); await t.waitForTimeout(300);
  await t.fill('#dlg-game input[name=title]', 'Letters and names');
  await t.click('#dlg-game .paste-many summary');
  await t.fill('#dlg-game [data-paste]', 'א = Aleph\nבּ = Bet\nב = Vet\nג = Gimmel\nד = Dalet\nה = Hey\nו = Vav\nז = Zayin');
  await t.click('#dlg-game [data-apply-paste]'); await t.waitForTimeout(200);
  console.log('1 pair rows:', await t.locator('#dlg-game .content-row').count(), '| toast:', await t.textContent('#toast'));
  await t.click('#dlg-game .theme-desert'); await t.screenshot({ path: 'own-make.png' });
  const [pv] = await Promise.all([t.context().waitForEvent('page'), t.click('#dlg-game [data-act=try]')]);
  await pv.waitForTimeout(2500);
  console.log('2 admin row:', await t.textContent('.rows[data-stripe="1"] .row:last-child .row-meta'), '| status:', await t.textContent('#status'));
  console.log('2 preview start screen:', (await pv.textContent('.og-screen')).replace(/\s+/g, ' ').trim());
  await pv.screenshot({ path: 'own-start.png' });
  await pv.click('[data-start]'); await pv.waitForTimeout(400);
  console.log('3 round:', await pv.textContent('[data-round]'), '| prompts:', await pv.$$eval('.og-prompt', l => l.map(x => x.textContent)), '| tiles:', await pv.locator('.og-tile').count());
  await pv.screenshot({ path: 'own-round.png' });
  await playMatch(pv, 1);
  await pv.waitForTimeout(600);
  console.log('4 end:', (await pv.textContent('.og-end')).replace(/\s+/g, ' ').trim(), '| dots:', await pv.$$eval('.og-dots i', l => l.map(x => x.className).join(',')));
  await pv.screenshot({ path: 'own-end.png' });
  console.log('4 no pass mark outside homework:', await pv.locator('.og-result').count() === 0, '| errors:', pv.errs);
  await pv.close();
  // 2. publish, class, homework with pass 90
  await t.click('#btn-save'); await t.waitForTimeout(500);
  await t.click('[data-tab=homework]'); await t.waitForTimeout(300);
  await t.click('[data-class-new]'); await t.fill('#dlg-hw input[name=name]', 'Grade 1'); await t.fill('#dlg-hw textarea[name=students]', 'sara@school.org, dov@school.org'); await t.click('#dlg-hw [data-act=save]'); await t.waitForTimeout(400);
  await t.click('[data-hw-new]'); await t.waitForTimeout(200);
  console.log('5 picker lists only own games:', await t.$$eval('#dlg-hw [data-pick]', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim())));
  await t.fill('#dlg-hw input[name=title]', 'Letter names'); await t.fill('#dlg-hw input[name=pass]', '90');
  await t.click('#dlg-hw [data-pick] >> nth=0'); await t.click('#dlg-hw [data-act=save]'); await t.waitForTimeout(400);
  const hw = Object.entries(DB).find(([p]) => p.startsWith('homework/'));
  console.log('5 homework stored:', JSON.stringify({ pass: hw[1].pass, items: hw[1].items }));
  // DB site/content published? the student site reads data/site.json unless Firestore REST has it; serve published data to the site
  const site = DB['site/content'];
  // 3. student: first try with 1 mistake (7/8 = 88% < 90) -> not passed; second try perfect -> passed
  const s = await browser(b, { email: 'sara@school.org', displayName: 'Sara Cohen' });
  await s.context().route('https://firestore.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ fields: { data: { stringValue: site.data } } }) }));
  await s.goto(B + '#/homework'); await s.waitForTimeout(1500);
  await s.screenshot({ path: 'dbg-hw.png' }); s.on('console', m => console.log('CONSOLE', m.text())); console.log('DBG user:', await s.evaluate(async () => { try { const u = await currentUser(); return u && u.email; } catch (e) { return 'ERR ' + e.message; } })); console.log('DBG list:', await s.evaluate(async () => { try { const l = await loadMyHomework(await currentUser()); return l.length; } catch (e) { return 'ERR ' + e.message + ' ' + e.stack.slice(0,300); } })); console.log('DBG hw page:', (await s.textContent('#app')).replace(/\s+/g,' ').slice(0,300), '| errs', s.errs);
  await s.click('.hw-game >> nth=0'); await s.waitForTimeout(1500);
  console.log('6 homework start screen:', (await s.textContent('.og-screen')).replace(/\s+/g, ' ').trim());
  await s.click('[data-start]'); await s.waitForTimeout(300);
  await playMatch(s, 1); await s.waitForTimeout(800);
  console.log('7 try 1:', (await s.textContent('.og-end')).replace(/\s+/g, ' ').trim());
  await s.screenshot({ path: 'own-fail.png' });
  await s.goto(B + '#/homework'); await s.waitForTimeout(1500);
  console.log('7 list after try 1:', await s.textContent('.hw-state'), '|', await s.textContent('.hw-card .progress-label'));
  await s.click('.hw-game >> nth=0'); await s.waitForTimeout(1500); await s.click('[data-start]'); await s.waitForTimeout(300);
  await playMatch(s, 0); await s.waitForTimeout(800);
  console.log('8 try 2:', (await s.textContent('.og-end')).replace(/\s+/g, ' ').trim());
  await s.screenshot({ path: 'own-pass.png' });
  await s.goto(B + '#/homework'); await s.waitForTimeout(1500);
  console.log('8 list after try 2:', await s.textContent('.hw-state'), '|', await s.textContent('.hw-card .progress-label'));
  // 4. teacher results
  await t.click('[data-hw-results] >> nth=0'); await t.waitForTimeout(800);
  console.log('9 results:', await t.$$eval('#dlg-hw tbody tr', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim())), '|', await t.textContent('#dlg-hw p.muted'));
  await t.screenshot({ path: 'own-results.png' });
  console.log('errors:', t.errs, s.errs);
  await b.close();
})();
