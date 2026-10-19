const { chromium } = require('playwright');
const B = process.env.BASE || 'http://localhost:8784/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' }, args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  for (const [w,h] of [[1280,650],[1366,657],[1536,730],[1920,950]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.route('https://firestore.googleapis.com/**', r => r.abort());
    await p.route('https://wordwall.net/**', r => r.abort());
    await p.goto(B + '#/red/1/play/' + (process.env.GID||'own-red-1')); await p.waitForTimeout(900);
    const m = await p.evaluate(() => { const r = s => { const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect(); return [Math.round(b.top),Math.round(b.width),Math.round(b.height)]; };
      return { header: r('.site-header'), crumbs: r('.crumbs'), head: r('.player-head'), how: r('.how-to'), player: r('.player'), bar: r('.player-bar') }; });
    console.log(w+'x'+h, JSON.stringify(m));
    if (w===1366) await p.screenshot({ path: `size-${process.env.TAG||'before'}.png` });
    await p.close();
  }
  await b.close();
})();
