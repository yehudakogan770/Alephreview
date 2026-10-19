const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  await p.route('https://firestore.googleapis.com/**', r => r.abort());
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8784/#/red/3'); await p.waitForTimeout(1500);
  console.log('width', await p.evaluate(() => document.documentElement.scrollWidth));
  await p.evaluate(() => window.scrollTo(0, 500)); await p.screenshot({ path: __dirname + '/phone-cards.png' });
  await b.close();
})();
