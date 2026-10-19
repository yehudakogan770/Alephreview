const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 760 } });
  await ctx.route('https://firestore.googleapis.com/**', r => r.abort());
  await ctx.addInitScript(() => { window.__a = []; const play = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (!window.__a.includes(this)) window.__a.push(this); return play.call(this); }; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const state = () => p.evaluate(() => window.__a.map(a => ({ src: a.src.split('/').pop(), paused: a.paused, t: +a.currentTime.toFixed(1), vol: a.volume, err: a.error && a.error.code })));
  for (const id of ['own-white-1', 'own-white-1-pairs']) {
    await p.goto('http://localhost:8784/#/white/1/play/' + id); await p.waitForTimeout(800);
    await p.click('[data-start]'); await p.waitForTimeout(2500);
    console.log(id, JSON.stringify(await state()));
  }
  await p.click('[data-music]'); await p.waitForTimeout(600); console.log('music off', JSON.stringify(await state()));
  await p.click('[data-music]'); await p.waitForTimeout(1200); console.log('music on', JSON.stringify(await state()));
  await p.goto('http://localhost:8784/#/white/1'); await p.waitForTimeout(800); console.log('left game', JSON.stringify(await state()));
  console.log('errors', errs);
  await b.close();
})();
