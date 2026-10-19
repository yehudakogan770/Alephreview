const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  const p = await b.newPage({viewport:{width:1280,height:860}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const B='https://yehudakogan770.github.io/Alephreview/';
  await p.goto(B); await p.waitForTimeout(2500);
  console.log('tiles:', await p.locator('.tile').count(), 'belt cards:', await p.locator('.belt-card').count());
  await p.screenshot({path:'live-new-home.png'});
  await p.click('.hero .btn-primary'); await p.waitForTimeout(1500); console.log('start ->', p.url());
  await p.click('.game-card >> nth=0');
  const f = await (await p.waitForSelector('.player iframe')).contentFrame();
  console.log('game loads in site:', await f.waitForSelector('text=Powered by Wordwall',{timeout:20000}).then(()=>true).catch(()=>false));
  console.log('errors:', errs); await b.close();
})();
