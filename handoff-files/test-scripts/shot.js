const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
  const p = await b.newPage({viewport:{width:1200,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  for (const [h,f] of [['','home'],['#/red','red'],['#/orange/2','o2']]) {
    await p.goto('http://localhost:8765/'+h); await p.waitForTimeout(400);
    await p.screenshot({path:f+'.png',fullPage:false});
  }
  await p.click('[data-view="type"]'); await p.waitForTimeout(200); await p.screenshot({path:'o2type.png'});
  await p.click('[data-view="all"]'); await p.click('[data-filter="match"]'); console.log('filtered cards', await p.locator('.game-card').count());
  await p.setViewportSize({width:390,height:800}); await p.goto('http://localhost:8765/#/white/1'); await p.waitForTimeout(300);
  await p.screenshot({path:'mobile.png'}); console.log('overflow', await p.evaluate(()=>document.documentElement.scrollWidth));
  console.log('errors', errs.filter(e=>!/wordwall|fonts|ERR_/.test(e)));
  await b.close();
})();
