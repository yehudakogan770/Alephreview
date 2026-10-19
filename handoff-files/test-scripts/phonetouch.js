const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  for (const vp of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await ctx.route('https://firestore.googleapis.com/**', r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    for (const path of ['', '#/white/1', '#/white/1/play/own-white-1-ww32232123']) {
      await p.goto('http://localhost:8784/' + path); await p.waitForTimeout(900);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      console.log(vp.width, path, 'scrollWidth', sw);
    }
    await p.tap('[data-start]'); await p.waitForTimeout(800);
    const n = await p.$$eval('.og-stage button, .og-stage [role=button]', a => a.length).catch(() => 0);
    const first = await p.$('.og-stage button:not([data-start])');
    if (first) { await first.tap(); await p.waitForTimeout(400); }
    await p.screenshot({ path: `pt-${vp.width}.png` });
    console.log('buttons', n);
    await ctx.close();
  }
  console.log('errors', errs);
  await b.close();
})();
