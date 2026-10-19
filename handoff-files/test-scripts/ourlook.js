const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  await p.route('https://firestore.googleapis.com/**', r => r.abort());
  for (const [n, u] of [['spinq', '#/red/2/play/own-red-2-ww94193075'], ['spin', '#/orange/1/play/own-orange-1-ww26271863'], ['deal', '#/orange/2/play/own-orange-2-ww94349304']]) {
    await p.goto('http://localhost:8784/' + u); await p.waitForTimeout(900);
    await p.click('[data-start]'); await p.waitForTimeout(600);
    const box = await (await p.$('#player')).boundingBox();
    await p.screenshot({ path: `cmp/our-${n}-1.png`, clip: box });
    const btn = await p.$('[data-spin], [data-deal]'); if (btn) await btn.click();
    await p.waitForTimeout(4600); await p.screenshot({ path: `cmp/our-${n}-2.png`, clip: box });
  }
  await b.close();
})();
