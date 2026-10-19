const { chromium } = require('playwright');
const ids = ['white/2/play/own-white-2-sort', 'red/1/play/own-red-1-whack', 'white/3/play/own-white-3-spin', 'orange/2/play/own-orange-2-gameshow', 'red/3/play/own-red-3-gaps'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  p.setDefaultTimeout(8000);
  await p.route('https://firestore.googleapis.com/**', r => r.abort());
  p.on('pageerror', e => console.log('ERR', e.message));
  for (const u of ids) {
    await p.goto('http://localhost:8784/#/' + u); await p.waitForTimeout(700);
    if (await p.$('[data-start]')) { await p.click('[data-start]'); await p.waitForTimeout(1500); }
    console.log(u, 'page width', await p.evaluate(() => document.documentElement.scrollWidth));
  }
  await p.screenshot({ path: 'phone-gaps.png' });
  await b.close();
})();
