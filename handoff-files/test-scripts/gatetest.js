const { chromium } = require('playwright');
const A = 'http://localhost:8777/admin.html';
// Stand-in Firebase: window.__fake controls who is signed in and whether they're an admin.
const FAKE = {
  'firebase-app.js': `export function initializeApp(c){ return {c}; }`,
  'firebase-auth.js': `
    let cb=null;
    export function getAuth(){ return {}; }
    export class GoogleAuthProvider { setCustomParameters(){} }
    export function onAuthStateChanged(a, f){ cb=f; setTimeout(()=>f(window.__fake.user), 50); }
    export async function signInWithPopup(){ window.__fake.user = window.__fake.next; cb(window.__fake.user); return {user: window.__fake.user}; }
    export async function signOut(){ window.__fake.user = null; cb(null); }`,
  'firebase-firestore.js': `
    export function getFirestore(){ return {}; }
    export function doc(db, ...p){ return p.join('/'); }
    export async function getDoc(path){ if (!window.__fake.admin) { const e=new Error('denied'); e.code='permission-denied'; throw e; } return {exists:()=>false}; }
    export async function setDoc(path, data){ window.__fake.saved = {path, data}; }
    export function serverTimestamp(){ return 'TS'; }`,
};
async function page(b, fake) {
  const ctx = await b.newContext({viewport:{width:1400,height:900}});
  await ctx.addInitScript(f => { window.__fake = f; }, fake);
  await ctx.route('**/js/firebase-config.js*', r => r.fulfill({contentType:'text/javascript', body:'const FIREBASE_CONFIG = {apiKey:"k", projectId:"test-proj", authDomain:"x"};'}));
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => { const f = r.request().url().split('/').pop(); r.fulfill({contentType:'text/javascript', headers:{'access-control-allow-origin':'*'}, body: FAKE[f]}); });
  await ctx.route('https://firestore.googleapis.com/**', r => r.fulfill({status:404, headers:{'access-control-allow-origin':'*'}, body:'{}'}));
  const p = await ctx.newPage(); p.errs=[]; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.accept());
  return p;
}
const state = async p => ({ locked: await p.evaluate(()=>document.body.classList.contains('locked')), msg: await p.textContent('#gate-msg'), editorVisible: await p.isVisible('.admin-main'), signInBtn: await p.isVisible('#gate-signin') });
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // 1. Not set up (real config file = null)
  let ctx = await b.newContext(); let p0 = await ctx.newPage(); await p0.goto(A); await p0.waitForTimeout(800);
  console.log('1 not set up:', JSON.stringify(await state(p0)), 'games rendered:', await p0.locator('.row').count()); await p0.screenshot({path:'gate-notsetup.png'}); await ctx.close();

  // 2. Signed out -> sign in with a non-admin
  let p = await page(b, {user:null, next:{email:'someone@gmail.com'}, admin:false});
  await p.goto(A); await p.waitForTimeout(800);
  console.log('2 signed out:', JSON.stringify(await state(p)));
  await p.screenshot({path:'gate-signin.png'});
  await p.click('#gate-signin'); await p.waitForTimeout(500);
  console.log('3 non-admin:', JSON.stringify(await state(p)), 'games rendered:', await p.locator('.row').count());
  await p.screenshot({path:'gate-denied.png'});
  await p.context().close();

  // 3. Admin signs in, edits, publishes, signs out
  p = await page(b, {user:null, next:{email:'admin@example.org'}, admin:true});
  await p.goto(A); await p.waitForTimeout(800);
  await p.click('#gate-signin'); await p.waitForTimeout(1200);
  console.log('4 admin:', JSON.stringify(await state(p)), 'games rendered:', await p.locator('.row').count(), '| account:', await p.textContent('#btn-account'));
  await p.click('[data-tab=words]'); await p.fill('input[data-text=footer]', 'Footer from test'); await p.dispatchEvent('input[data-text=footer]','input');
  await p.click('#btn-save'); await p.waitForTimeout(500);
  const saved = await p.evaluate(()=>window.__fake.saved);
  console.log('5 publish:', saved.path, JSON.parse(saved.data.data).text.footer, saved.data.updatedBy, '| toast:', await p.textContent('#toast'), '| status:', await p.textContent('#status'));
  await p.click('#btn-account'); await p.waitForTimeout(400);
  console.log('6 signed out:', JSON.stringify(await state(p)), 'games rendered:', await p.locator('.row').count());
  // 4. already signed in when page opens
  await p.context().close();
  p = await page(b, {user:{email:'admin@example.org'}, admin:true});
  await p.goto(A); await p.waitForTimeout(1500);
  console.log('7 returning admin:', JSON.stringify(await state(p)));
  console.log('errors:', p0.errs||[], p.errs);
  await b.close();
})();
