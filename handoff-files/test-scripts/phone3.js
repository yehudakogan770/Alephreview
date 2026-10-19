const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [name, vp] of [['port', { width: 390, height: 844 }], ['land', { width: 844, height: 390 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await ctx.route('https://firestore.googleapis.com/**', r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('ERR', e.message));
    for (const id of ['white/1/play/own-white-1', 'white/1/play/own-white-1-quiz', 'red/3/play/own-red-3-sort']) {
      await p.goto('http://localhost:8784/#/' + id); await p.waitForTimeout(1200);
      await p.tap('[data-start]'); await p.waitForTimeout(600);
      await p.screenshot({ path: `${__dirname}/ph-${name}-${id.split('-').pop()}.png` });
    }
    console.log(name, 'width', await p.evaluate(() => document.documentElement.scrollWidth));
    await ctx.close();
  }
  await b.close();
})();
