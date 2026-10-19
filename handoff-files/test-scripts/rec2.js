const { chromium } = require('playwright');
const site = require('/home/user/Alephreview/data/site.json');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 760 } });
  await ctx.route('https://firestore.googleapis.com/**', r => r.abort());
  await ctx.addInitScript(() => { window.__a = []; const play = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__a.push(this); return play.call(this); }; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const games = site.games.white['1'].filter(g => g.own && !g.hidden).slice(0, 8);
  for (const g of games) {
    await p.goto('http://localhost:8784/#/white/1/play/' + g.id); await p.waitForTimeout(600);
    await p.click('[data-start]'); await p.waitForTimeout(1200);
    const now = await p.evaluate(() => { const a = window.__a.filter(x => !x.paused).pop(); return a ? a.src.split('/').pop() + ' t=' + a.currentTime.toFixed(1) : 'none'; });
    console.log(g.own.kind.padEnd(10), now);
  }
  console.log('errors', errs);
  await b.close();
})();
