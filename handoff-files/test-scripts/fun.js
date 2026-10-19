const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  const B='http://localhost:8769/';
  const ctx = await b.newContext({viewport:{width:1280,height:900}});
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(B);
  // White stripe 1 fully played, stripe 2 partly
  const GAMES = await p.evaluate(()=>GAMES);
  const ids = GAMES.white[1].filter(g=>!g.hidden).map(g=>g.id).concat(GAMES.white[2].slice(0,4).map(g=>g.id));
  await p.evaluate(ids=>{localStorage.setItem('played',JSON.stringify(ids));localStorage.removeItem('celebrated');}, ids);
  await p.goto(B+'?r=1#/'); await p.waitForTimeout(2500); await p.screenshot({path:'fun-home.png', fullPage:true});
  await p.goto(B+'#/white'); await p.waitForTimeout(1200); await p.screenshot({path:'fun-belt.png'});
  await p.goto(B+'#/white/1'); await p.waitForTimeout(700); await p.screenshot({path:'fun-celebrate.png'});
  console.log('toast:', await p.locator('.toast').textContent().catch(()=>'none'), 'confetti pieces:', await p.locator('.confetti i').count());
  await p.waitForTimeout(5000);
  await p.goto(B+'#/red'); await p.goto(B+'#/white/1'); await p.waitForTimeout(500);
  console.log('second visit toast count:', await p.locator('.toast').count());
  await p.goto(B+'#/white/2'); await p.waitForTimeout(2500); await p.screenshot({path:'fun-stripe.png'});
  await p.click('[data-view="type"]'); await p.waitForTimeout(1500); await p.screenshot({path:'fun-bytype.png'});
  await p.click('[data-view="all"]');
  console.log('errors', errs); await b.close();
})();
