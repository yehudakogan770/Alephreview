const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 760 } });
  await ctx.route('https://firestore.googleapis.com/**', r => r.abort());
  await ctx.addInitScript(() => { window.__n = 0; const o = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { window.__n++; return o.call(this); }; const s = AudioContext.prototype.createBufferSource; AudioContext.prototype.createBufferSource = function () { window.__n++; return s.call(this); }; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const site = require('/home/user/Alephreview/data/site.json');
  const ids = site.games.white['1'].filter(g => g.own && !g.hidden).slice(0, 4).map(g => g.id);
  for (const id of ids) {
    await p.goto('http://localhost:8784/#/white/1/play/' + id); await p.waitForTimeout(700);
    await p.click('[data-start]'); await p.waitForTimeout(2000);
    // which song is playing: read the private state through the bpm heard in scheduling isn't exposed; just count sounds
    console.log(id, 'sounds', await p.evaluate(() => window.__n));
  }
  // every song builds without error
  const r = await p.evaluate(() => Object.keys(GAME_SONGS).map((n, i) => { try { gameMusic.start(i, () => true); return n + ':ok'; } catch (e) { return n + ':' + e.message; } }));
  console.log(r.join(' '));
  await p.waitForTimeout(500);
  console.log('errors', errs);
  await b.close();
})();
