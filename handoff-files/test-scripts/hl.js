const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await b.newPage({viewport:{width:1280,height:400}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  for (const h of ['', '#/red', '#/red/1', '#/red/1/play/94191495', '#/']) {
    await p.goto('http://localhost:8768/'+h); await p.waitForTimeout(300);
    console.log(h||'(home)', 'All belts visible:', await p.locator('.header-link').isVisible());
  }
  await p.goto('http://localhost:8768/#/red'); await p.click('.header-link'); await p.waitForTimeout(300);
  console.log('after click:', p.url(), 'visible:', await p.locator('.header-link').isVisible());
  console.log('errors', errs); await b.close();
})();
