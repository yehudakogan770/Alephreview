const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  await p.route('https://firestore.googleapis.com/**', r => r.abort());
  p.on('pageerror', e => console.log('ERR', e.message));
  for (const [u, n] of [['#/white/1', 'cards1'], ['#/red/3', 'cards2'], ['#/orange/2', 'cards3'], ['#/white/3', 'cards4']]) {
    await p.goto('http://localhost:8784/' + u); await p.waitForTimeout(1500);
    await p.evaluate(() => window.scrollTo(0, 420)); await p.waitForTimeout(300);
    await p.screenshot({ path: __dirname + '/' + n + '.png' });
  }
  await b.close();
})();
