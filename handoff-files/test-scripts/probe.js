const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'}});
  const p = await b.newPage();
  p.on('requestfailed',r=>console.log('FAIL',r.url().slice(0,70),r.failure().errorText));
  p.on('response',r=>{ if(/wordwall/.test(r.url())) console.log('OK',r.status(),r.url().slice(0,70))});
  await p.goto('http://localhost:8765/#/orange/1'); await p.waitForTimeout(4000); await b.close();
})();
