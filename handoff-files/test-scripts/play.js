const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  const p = await b.newPage({viewport:{width:1200,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/#/orange/1'); await p.waitForTimeout(800);
  await p.click('.game-card >> nth=0'); await p.waitForTimeout(8000);
  console.log('url', p.url());
  const f = p.frames().find(f=>/wordwall.net\/embed/.test(f.url()));
  console.log('frame', f && f.url(), f && (await f.evaluate(()=>document.body.innerText.slice(0,200)).catch(e=>'ERR '+e.message)));
  await p.screenshot({path:'player.png'});
  await p.click('text=Next game →'); await p.waitForTimeout(500); console.log('next', p.url());
  await p.goBack(); await p.goBack(); await p.waitForTimeout(300); console.log('back', p.url(), await p.locator('.game-card.played').count());
  await p.setViewportSize({width:390,height:800}); await p.goto('http://localhost:8765/#/red/3/play/94307410'); await p.waitForTimeout(6000);
  await p.screenshot({path:'player-mobile.png'}); console.log('overflow', await p.evaluate(()=>document.documentElement.scrollWidth));
  console.log('errors',errs); await b.close();
})();
