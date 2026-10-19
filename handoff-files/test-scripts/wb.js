const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const p = await b.newPage({ viewport: { width: 1366, height: 800 } });
  await p.route('https://firestore.googleapis.com/**', r => r.abort());
  p.on('pageerror', e => console.log('ERR', e.message));
  const t = Date.now();
  await p.goto('http://localhost:8784/#/white');
  await p.waitForSelector('.stripe-card', { timeout: 30000 });
  console.log('stripes after', Date.now() - t, 'ms:', await p.locator('.stripe-card').count());
  await b.close();
})();
