const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors-spki-list=' + require('fs').readFileSync(__dirname + '/spki.txt', 'utf8').trim()] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 760 } });
  await ctx.addInitScript(() => {
    const desc = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'destination');
    Object.defineProperty(BaseAudioContext.prototype, 'destination', { get() {
      if (!this.__an) { this.__an = this.createAnalyser(); this.__an.connect(desc.get.call(this)); window.__an = this.__an; window.__ac = this; }
      return this.__an; } });
  });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('response', r => r.status() >= 400 && errs.push(r.status() + ' ' + r.url()));
  await p.goto('https://yehudakogan770.github.io/Alephreview/#/white/1/play/own-white-1', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  console.log('scripts', await p.evaluate(() => [...document.scripts].map(s => s.src).filter(s => /engine/.test(s))));
  console.log('has music btn', !!await p.$('[data-music]'), 'typeof gameMusic', await p.evaluate(() => typeof gameMusic));
  await p.click('[data-start]'); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { if (!window.__an) return 'no audio graph'; const a = new Float32Array(window.__an.fftSize); let peak = 0; for (let k = 0; k < 20; k++) {} window.__an.getFloatTimeDomainData(a); for (const v of a) peak = Math.max(peak, Math.abs(v)); return { state: window.__ac.state, peak, speaking: speechSynthesis.speaking, music: localStorage.getItem('og-music'), mute: localStorage.getItem('og-mute') }; });
  console.log(r);
  const peaks = await p.evaluate(async () => { const out = []; const a = new Float32Array(2048); for (let k = 0; k < 10; k++) { await new Promise(r => setTimeout(r, 150)); window.__an.getFloatTimeDomainData(a); let m = 0; for (const v of a) m = Math.max(m, Math.abs(v)); out.push(+m.toFixed(3)); } return out; });
  console.log('peaks', peaks);
  console.log('errors', errs);
  await b.close();
})();
