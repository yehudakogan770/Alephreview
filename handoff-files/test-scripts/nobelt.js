const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await b.newPage({viewport:{width:1200,height:620}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  for (const [h,f] of [['','nb-home'],['#/red','nb-red'],['#/red/1','nb-red1']]) { await p.goto('http://localhost:8766/'+h); await p.waitForTimeout(500); await p.screenshot({path:f+'.png'}); }
  console.log('errors',errs, 'belt elements', await p.locator('.belt').count()); await b.close();
})();
