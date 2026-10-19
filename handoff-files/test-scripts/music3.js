const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.addInitScript(() => { window.__log = []; const o = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { const x = o.call(this); const s = x.start.bind(x); x.start = t => { window.__log.push([+t.toFixed(2), x.type, Math.round(x.frequency.value)]); s(t); }; return x; }; });
  await p.goto('http://localhost:8784/#/white/1/play/own-white-1'); await p.waitForTimeout(800);
  await p.click('[data-start]'); await p.waitForTimeout(2300);
  console.log(JSON.stringify(await p.evaluate(() => window.__log)));
  await b.close();
})();
