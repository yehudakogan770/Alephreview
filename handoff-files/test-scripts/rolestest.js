const { chromium } = require('playwright');
const FAKE = {
  'firebase-app.js': `export function initializeApp(c){ return {c}; }`,
  'firebase-auth.js': `
    export function getAuth(){ return {}; }
    export class GoogleAuthProvider { setCustomParameters(){} }
    let cb; export function onAuthStateChanged(a, f){ cb=f; setTimeout(()=>f(window.__fake.user), 50); }
    export async function signInWithPopup(){ cb(window.__fake.user); }
    export async function signOut(){ window.__fake.user=null; cb(null); }`,
  'firebase-firestore.js': `
    const F = () => window.__fake;
    const deny = () => { const e=new Error('denied'); e.code='permission-denied'; throw e; };
    export function getFirestore(){ return {}; }
    export function doc(db, ...p){ return p.join('/'); }
    export function collection(db, name){ return name; }
    export async function getDoc(path){
      if (path==='admin/check' && !(F().owner || F().editor)) deny();
      if (path==='admin/owner' && !F().owner) deny();
      return {exists:()=>false};
    }
    export async function getDocs(name){ return {docs: Object.entries(F().editors).map(([id,d])=>({id, data:()=>d}))}; }
    export async function setDoc(path, data){ if (path.startsWith('editors/')) { if (!F().owner) deny(); F().editors[path.slice(8)] = data; } else F().saved = {path, data}; }
    export async function deleteDoc(path){ if (!F().owner) deny(); delete F().editors[path.slice(8)]; }
    export function serverTimestamp(){ return 'TS'; }`,
};
async function page(b, fake) {
  const ctx = await b.newContext({viewport:{width:1400,height:900}});
  await ctx.addInitScript(f => { window.__fake = f; }, fake);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({contentType:'text/javascript', headers:{'access-control-allow-origin':'*'}, body: FAKE[r.request().url().split('/').pop()]}));
  await ctx.route('https://firestore.googleapis.com/**', r => r.fulfill({status:404, headers:{'access-control-allow-origin':'*'}, body:'{}'}));
  const p = await ctx.newPage(); p.errs=[]; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.accept());
  return p;
}
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const A = 'http://localhost:8781/admin.html';
  // full admin
  let p = await page(b, {user:{email:'owner@example.org'}, owner:true, editor:false, editors:{'old@gmail.com':{addedBy:'owner@example.org'}}});
  await p.goto(A); await p.waitForTimeout(1800);
  console.log('FULL: admins tab visible:', await p.isVisible('[data-tab=admins]'));
  await p.click('[data-tab=admins]'); await p.waitForTimeout(400);
  console.log('FULL: list:', (await p.$$eval('#sub-admins li', l=>l.map(x=>x.textContent.replace(/\s+/g,' ').trim()))));
  await p.fill('#add-admin input[name=email]', 'New.Helper@Gmail.com'); await p.click('#add-admin button'); await p.waitForTimeout(400);
  console.log('FULL: after add:', (await p.$$eval('.admin-email', l=>l.map(x=>x.textContent))), '| toast:', await p.textContent('#toast'));
  await p.fill('#add-admin input[name=email]', 'not-an-email'); await p.click('#add-admin button'); await p.waitForTimeout(200);
  console.log('FULL: bad email blocked by form:', await p.$eval('#add-admin input[name=email]', e => !e.checkValidity()));
  await p.click('[data-remove-admin="old@gmail.com"]'); await p.waitForTimeout(400);
  console.log('FULL: after remove:', (await p.$$eval('.admin-email', l=>l.map(x=>x.textContent))));
  await p.screenshot({path:'admins-tab.png'});
  console.log('FULL errors:', p.errs); await p.context().close();
  // sub-admin
  p = await page(b, {user:{email:'new.helper@gmail.com'}, owner:false, editor:true, editors:{}});
  await p.goto(A); await p.waitForTimeout(1800);
  console.log('SUB: editor open:', await p.isVisible('.admin-main'), '| admins tab visible:', await p.isVisible('[data-tab=admins]'), '| games rows:', await p.locator('.row').count());
  await p.click('[data-tab=words]'); await p.fill('input[data-text=footer]','x'); await p.dispatchEvent('input[data-text=footer]','input'); await p.click('#btn-save'); await p.waitForTimeout(400);
  console.log('SUB: can publish:', await p.evaluate(()=>!!window.__fake.saved), '| errors:', p.errs); await p.context().close();
  // not an admin
  p = await page(b, {user:{email:'random@gmail.com'}, owner:false, editor:false, editors:{}});
  await p.goto(A); await p.waitForTimeout(1500);
  console.log('NONE:', await p.textContent('#gate-msg'), '| editor hidden:', !(await p.isVisible('.admin-main')));
  await b.close();
})();
