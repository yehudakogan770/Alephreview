const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  const B='http://localhost:8767/';
  const shots = async (vp, scheme, list, prefix) => {
    const ctx = await b.newContext({viewport:vp, colorScheme:scheme});
    const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto(B); await p.evaluate(()=>localStorage.setItem('played', JSON.stringify(["32232123","38791608","27259465","27621153","7947346","3964427","35128434","5783609","23872088","59697148","38448776","72336687","28882327","3769520"])));
    for (const [h,f,full] of list) { await p.goto(B+h); await p.waitForTimeout(h.includes('play')?6000:2500); await p.screenshot({path:prefix+f+'.png', fullPage:!!full}); }
    const w = await p.evaluate(()=>document.documentElement.scrollWidth); console.log(prefix, 'width', w, 'errors', errs);
    await ctx.close();
  };
  await shots({width:1280,height:860},'light',[['','home',1],['#/white','belt',1],['#/red/1','stripe'],['#/red/1/play/94191495','player'],['#/yellow','yellow']],'d-');
  await shots({width:390,height:844},'light',[['','home',1],['#/white/2','stripe'],['#/white/2/play/28882327','player']],'m-');
  await shots({width:1280,height:860},'dark',[['','home'],['#/orange/2','stripe']],'k-');
  await b.close();
})();
