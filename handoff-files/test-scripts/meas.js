const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await b.newPage({viewport:{width:390,height:844}});
  await p.goto('http://localhost:8767/#/white/2'); await p.waitForTimeout(500);
  console.log(await p.$$eval('.seg', els => els.map(e => Math.round(e.getBoundingClientRect().height))));
  await b.close();
})();
