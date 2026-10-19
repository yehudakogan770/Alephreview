const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const p = await b.newPage({ viewport: { width: 1366, height: 657 } });
  await p.route('https://firestore.googleapis.com/**', r => r.abort());
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8784/#/orange/2/play/own-orange-2-quiz'); await p.waitForTimeout(800);
  await p.click('[data-start]', { timeout: 3000 }); await p.waitForTimeout(400);
  console.log(await p.textContent('.og-question'), '|', (await p.$$eval('.og-answer', l => l.map(x => x.textContent.trim()))).join(','));
  await p.screenshot({ path: 'one.png' });
  await b.close();
})();
