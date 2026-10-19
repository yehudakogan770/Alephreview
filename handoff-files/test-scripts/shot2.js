const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY||process.env.https_proxy,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]}).catch(()=>chromium.launch());
  const p = await b.newPage({viewport:{width:1200,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  let total=0, broken=[];
  for (const belt of ['white','red','orange']) for (const s of [1,2,3]) {
    await p.goto(`http://localhost:8765/#/${belt}/${s}`); await p.waitForTimeout(200);
    await p.evaluate(async()=>{for(const i of document.querySelectorAll('img')){i.loading='eager';}});
    await p.waitForTimeout(2500);
    const r = await p.evaluate(()=>({cards:document.querySelectorAll('.game-card').length, fallback:[...document.querySelectorAll('.game-card')].filter(c=>c.querySelector('.thumb-fallback')||!c.querySelector('img')?.naturalWidth).map(c=>c.querySelector('.game-title').textContent)}));
    total+=r.cards; broken.push(...r.fallback.map(t=>belt+s+': '+t));
  }
  console.log('cards',total,'no picture',broken);
  await p.goto('http://localhost:8765/#/red/1'); await p.waitForTimeout(2500); await p.screenshot({path:'red1.png'});
  await p.click('[data-view="type"]'); await p.waitForTimeout(2000); await p.screenshot({path:'red1type.png'});
  console.log('errors',errs); await b.close();
})();
