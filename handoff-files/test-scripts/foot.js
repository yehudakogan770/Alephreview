const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const p = await b.newPage({ viewport: vp });
    await p.route('https://firestore.googleapis.com/**', r => r.abort());
    await p.goto('http://localhost:8784/'); await p.waitForTimeout(1200);
    const f = await p.$('.site-footer'); await f.screenshot({ path: __dirname + `/foot-${vp.width}.png` });
    console.log(await f.innerText());
  }
  await b.close();
})();
