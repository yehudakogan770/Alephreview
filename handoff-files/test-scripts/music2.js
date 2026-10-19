const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.goto('http://localhost:8784/#/white/1/play/own-white-1'); await p.waitForTimeout(800);
  await p.click('[data-start]');
  const r = await p.evaluate(async () => { const c = ogAudio(); const a = c.currentTime, t = performance.now(); await new Promise(r => setTimeout(r, 3000)); return [c.currentTime - a, (performance.now() - t) / 1000, c.state]; });
  console.log(r);
  await b.close();
})();
