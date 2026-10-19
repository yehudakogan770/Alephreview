const { chromium } = require('playwright');
const site = require('/home/user/Alephreview/data/site.json');
const B = 'http://localhost:8784/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' }, args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.route('https://firestore.googleapis.com/**', r => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
  for (const [belt, stripes] of Object.entries(site.games)) for (const [s, list] of Object.entries(stripes)) for (const g of list) {
    if (!g.own) continue;
    await p.goto(B + `#/${belt}/${s}`); await p.waitForTimeout(700);
    const first = await p.$$eval('#app a[href*="/play/"]', l => l.slice(0,1).map(a => a.getAttribute('href') + ' | ' + a.textContent.replace(/\s+/g,' ').trim()));
    if (belt==='white'&&s==='1') await p.screenshot({ path: 'ready-stripe.png' });
    await p.goto(B + `#/${belt}/${s}/play/${g.id}`); await p.waitForTimeout(800);
    await p.click('[data-start]'); await p.waitForTimeout(400);
    let rounds = 0;
    while (await p.$('.og-matchup')) {
      rounds++;
      for (const box of await p.$$('.og-box')) {
        const want = await box.getAttribute('data-target');
        await (await p.$(`.og-bank .og-tile[data-tile="${want}"]`)).click(); await box.click();
      }
      await p.click('[data-submit]'); await p.waitForTimeout(200); await p.click('[data-continue]'); await p.waitForTimeout(500);
    }
    if (g.id==='own-red-1') await p.screenshot({ path: 'ready-end.png' });
    console.log(g.id, g.own.theme, 'pairs', g.own.pairs.length, 'rounds', rounds, '| first on stripe:', first[0], '| end:', (await p.textContent('.og-percent')));
  }
  console.log('errors:', errs);
  await b.close();
})();
