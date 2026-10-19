const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' }, args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  for (const [w,h] of [[900,700],[390,800]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.route('https://firestore.googleapis.com/**', r => r.abort());
    await p.goto('http://localhost:8784/#/red/1/play/own-red-1'); await p.waitForTimeout(900);
    console.log(w, 'scrollW', await p.evaluate(() => document.documentElement.scrollWidth));
    await p.screenshot({ path: `narrow-${w}.png` }); await p.close();
  }
  await b.close();
})();
