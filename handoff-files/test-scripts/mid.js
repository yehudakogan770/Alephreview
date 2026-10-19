const { chromium } = require('playwright');
const shots = [['white/2/play/own-white-2-fruit', 3500, 'mid-fruit'], ['white/2/play/own-white-2-plane', 4500, 'mid-plane'], ['red/1/play/own-red-1-whack', 2600, 'mid-whack'],
  ['white/3/play/own-white-3-spin', 0, 'mid-spin'], ['red/3/play/own-red-3-flip', 0, 'mid-flip'], ['orange/2/play/own-orange-2-deal', 0, 'mid-deal'], ['white/3/play/own-white-3-watch', 800, 'mid-watch'], ['white/1/play/own-white-1-balloon', 0, 'mid-balloon']];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const p = await b.newPage({ viewport: { width: 1366, height: 657 } });
  p.setDefaultTimeout(8000);
  await p.route('https://firestore.googleapis.com/**', r => r.abort());
  p.on('pageerror', e => console.log('ERR', e.message));
  for (const [u, wait, name] of shots) {
    await p.goto('http://localhost:8784/#/' + u); await p.waitForTimeout(700);
    await p.click('[data-start]'); await p.waitForTimeout(wait);
    if (name === 'mid-spin') { await p.click('[data-spin]'); await p.waitForTimeout(4400); }
    if (name === 'mid-flip') { await p.click('.og-flipcard'); await p.waitForTimeout(700); }
    if (name === 'mid-deal') { await p.click('[data-deal]'); await p.waitForTimeout(600); }
    if (name === 'mid-balloon') { await p.waitForTimeout(1200); await p.keyboard.press('Space'); await p.waitForTimeout(1000); }
    await (await p.$('.og')).screenshot({ path: name + '.png' });
  }
  await b.close();
})();
