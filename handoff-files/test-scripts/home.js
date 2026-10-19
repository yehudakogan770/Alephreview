const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  const p = await b.newPage({viewport:{width:1200,height:720}});
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500); await p.screenshot({path:'home2.png'});
  await p.goto('http://localhost:8765/#/yellow'); await p.waitForTimeout(800); await p.screenshot({path:'yellow.png'});
  await b.close();
})();
