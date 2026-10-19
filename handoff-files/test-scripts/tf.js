const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' }, args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const p = await b.newPage({ viewport: { width: 1366, height: 657 } });
  await p.route('https://firestore.googleapis.com/**', r => r.abort());
  await p.goto('http://localhost:8784/#/white/2/play/own-white-2-truefalse'); await p.waitForTimeout(1200);
  await p.click('[data-start]'); await p.waitForTimeout(800);
  for (let i = 0; i < 3; i++) {
    console.log(await p.textContent('[data-a]'), await p.$eval('[data-a]', e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return [r.width, r.height, cs.fontSize, cs.fontFamily, cs.overflow].join(' '); }));
    await (await p.$('.og-tf-card')).screenshot({ path: `tf${i}.png` });
    await p.click('[data-say="yes"]'); await p.waitForTimeout(1800);
  }
  await b.close();
})();
