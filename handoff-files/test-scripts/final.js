const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  const p = await b.newPage({viewport:{width:1200,height:760}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const B='https://yehudakogan770.github.io/Alephreview/';
  await p.goto(B); await p.waitForTimeout(1500);
  console.log('belt drawings:', await p.locator('.belt').count(), 'belt cards:', await p.locator('.belt-card').count());
  await p.goto(B+'#/red/1'); await p.waitForTimeout(3000);
  const href = await p.getAttribute('.game-card >> nth=0','href'); console.log('first card link:', href);
  await p.click('.game-card >> nth=0');
  const f = await (await p.waitForSelector('.player iframe')).contentFrame();
  console.log('game loads in site:', await f.waitForSelector('text=Powered by Wordwall',{timeout:20000}).then(()=>true).catch(()=>false));
  await p.goto(B+'#/red/1'); await p.waitForTimeout(3000); await p.screenshot({path:'final-red1.png'});
  console.log('errors:', errs); await b.close();
})();
