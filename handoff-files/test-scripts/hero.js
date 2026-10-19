const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  for (const [scheme,f] of [['light','hero-light.png'],['dark','hero-dark.png']]) {
    const ctx = await b.newContext({viewport:{width:1280,height:1000}, colorScheme:scheme});
    const p = await ctx.newPage(); await p.goto('http://localhost:8768/'); await p.waitForTimeout(2500); await p.screenshot({path:f}); await ctx.close();
  }
  const p = await b.newPage({viewport:{width:1280,height:600}});
  for (const h of ['#/yellow','#/orange/3','#/black/2']) { await p.goto('http://localhost:8768/'+h); await p.waitForTimeout(300); console.log(h,'->',p.url().replace('http://localhost:8768/','')); }
  await b.close();
})();
