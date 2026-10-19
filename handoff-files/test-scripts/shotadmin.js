const { chromium } = require('playwright');
const src = require('fs').readFileSync(__dirname + '/gatetest.js', 'utf8');
const FAKE = eval('(' + src.match(/const FAKE = (\{[\s\S]*?\n\});/)[1] + ')');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  const ctx = await b.newContext({viewport:{width:1500,height:900}});
  await ctx.addInitScript(() => { window.__fake = {user:{email:'admin@example.org'}, admin:true}; });
  await ctx.route('**/js/firebase-config.js*', r => r.fulfill({contentType:'text/javascript', body:'const FIREBASE_CONFIG = {apiKey:"k", projectId:"test-proj"};'}));
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({contentType:'text/javascript', headers:{'access-control-allow-origin':'*'}, body: FAKE[r.request().url().split('/').pop()]}));
  await ctx.route('https://firestore.googleapis.com/**', r => r.fulfill({status:404, headers:{'access-control-allow-origin':'*'}, body:'{}'}));
  const p = await ctx.newPage();
  await p.goto('http://localhost:8777/admin.html'); await p.waitForTimeout(3000);
  await p.screenshot({path:'admin-games.png'});
  await p.click('[data-tab=words]'); await p.waitForTimeout(300); await p.screenshot({path:'admin-words.png'});
  await p.click('[data-tab=games]'); await p.click('.rows[data-stripe="1"] .row:nth-child(3) [data-edit]'); await p.waitForTimeout(800); await p.screenshot({path:'admin-edit.png'});
  await b.close();
})();
