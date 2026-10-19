// Plays every ready-made game made here, all right answers, and checks the score.
const { chromium } = require('playwright');
const site = require('/home/user/Alephreview/data/site.json');
const B = process.env.BASE || 'http://localhost:8784/';
const ONLY = (process.env.KINDS || '').split(',').filter(Boolean);
const { players, problems, bad, norm } = require('./players');
const W = process.env.WRONG === '1';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: process.env.BASE ? { server: process.env.HTTPS_PROXY } : undefined, args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 657 } });
  await ctx.route('https://firestore.googleapis.com/**', r => r.abort());
  const p = await ctx.newPage(); p.setDefaultTimeout(8000); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const shots = new Set();
  for (const [belt, stripes] of Object.entries(site.games)) for (const [s, list] of Object.entries(stripes)) for (const g of list) {
    if (!g.own) continue;
    const kind = g.own.kind;
    if (ONLY.length && !ONLY.includes(kind)) continue;
    if (process.env.IDS && !process.env.IDS.split(',').includes(g.id)) continue;
    await p.goto(B + `#/${belt}/${s}/play/${g.id}`); await p.waitForTimeout(700);
    const shot = !shots.has(kind); shots.add(kind);
    if (shot) await p.screenshot({ path: `k-${kind}-start.png` });
    await p.evaluate(o => { window.__own = o; }, g.own); await p.evaluate(require('./players').RIGHT_FOR);
    await p.click('[data-start]'); await p.waitForTimeout(400);
    if (shot) await p.screenshot({ path: `k-${kind}-play.png` });
    const t0 = Date.now();
    await players[kind](p, g.own, shot, kind);
    await p.waitForTimeout(500);
    const pct = norm(await p.textContent('.og-percent').catch(() => 'none'));
    const score = norm(await p.textContent('.og-score').catch(() => ''));
    if (shot) await p.screenshot({ path: `k-${kind}-end.png` });
    console.log(g.id, '|', score, '|', ((Date.now() - t0) / 1000).toFixed(0) + 's');
    const CARDS = ['spin', 'openbox', 'flip', 'deal'];
    if (CARDS.includes(kind)) { const end = norm(await p.textContent('.og-end').catch(() => '')); console.log('  end:', end); if (!end.startsWith('All done')) bad(`${g.id}: no All done`); continue; }
    if (!W && pct !== '100%') bad(`${g.id}: ${pct}`);
    if (W && pct !== '0%') bad(`${g.id}: wrong play gave ${pct}`);
    if (shot && await p.$('[data-reveal]')) { await p.click('[data-reveal]'); await p.waitForTimeout(300); await p.screenshot({ path: `k-${kind}-answers.png` }); }
  }
  console.log('page errors:', errs, '\nPROBLEMS:', problems.length);
  await b.close();
})();
