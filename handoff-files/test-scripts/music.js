const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 760 } });
  await ctx.route('https://firestore.googleapis.com/**', r => r.abort());
  await ctx.addInitScript(() => {
    window.__osc = 0;
    const o = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () { window.__osc++; return o.call(this); };
  });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const site = require('/home/user/Alephreview/data/site.json');
  const themes = {};
  for (const [belt, st] of Object.entries(site.games)) for (const [s, l] of Object.entries(st)) for (const g of l) if (g.own && !themes[g.own.theme || 'meadow']) themes[g.own.theme || 'meadow'] = `#/${belt}/${s}/play/${g.id}`;
  console.log(themes);
  for (const [t, url] of Object.entries(themes)) {
    await p.goto('http://localhost:8784/' + url); await p.waitForTimeout(800);
    const before = await p.evaluate(() => window.__osc);
    await p.click('[data-start]'); await p.waitForTimeout(3000);
    const during = await p.evaluate(() => window.__osc);
    console.log(t, 'notes in 3s', during - before);
  }
  // music button off
  await p.click('[data-music]'); await p.waitForTimeout(500);
  let a = await p.evaluate(() => window.__osc); await p.waitForTimeout(1500);
  console.log('after music off', (await p.evaluate(() => window.__osc)) - a);
  await p.click('[data-music]'); await p.waitForTimeout(1500);
  a = await p.evaluate(() => window.__osc); await p.waitForTimeout(1500);
  console.log('after music on', (await p.evaluate(() => window.__osc)) - a);
  await p.click('[data-mute]'); await p.waitForTimeout(500);
  a = await p.evaluate(() => window.__osc); await p.waitForTimeout(1500);
  console.log('after sound off', (await p.evaluate(() => window.__osc)) - a);
  await p.click('[data-mute]'); await p.waitForTimeout(500);
  await p.goto('http://localhost:8784/#/white/1'); await p.waitForTimeout(500);
  a = await p.evaluate(() => window.__osc); await p.waitForTimeout(1500);
  console.log('after leaving game', (await p.evaluate(() => window.__osc)) - a);
  await p.goto('http://localhost:8784/' + themes.meadow); await p.waitForTimeout(800);
  await p.screenshot({ path: 'music-btn.png', clip: { x: 0, y: 0, width: 1280, height: 400 } });
  console.log('errors', errs);
  await b.close();
})();
