const { chromium } = require('playwright');
const { DB, browser } = require('./harness');
const { players } = require('./players');
players.spin = async p => {
  for (let k = 0; k < 5; k++) { await p.click(k ? '[data-again]' : '[data-spin]'); await p.waitForTimeout(4400); }
  await p.click('[data-out]'); await p.waitForTimeout(300);
  if (!(await p.$('.og-end'))) await p.click('[data-done]');
};
const site = require('/home/user/Alephreview/data/site.json');
const find = id => { for (const st of Object.values(site.games)) for (const l of Object.values(st)) for (const g of l) if (g.id === id) return g; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ids = ['own-white-1-flip', 'own-white-2-openbox', '28882327', 'own-red-1-deal'];
  DB['homework/h2'] = { title: 'Cards', students: ['sara@school.org'], pass: 80, items: ids.map(game => ({ game })) };
  const st = await browser(b, { email: 'sara@school.org', displayName: 'Sara Cohen' });
  await st.setViewportSize({ width: 1280, height: 760 });
  for (const id of ids) {
    await st.goto('http://localhost:8784/#/homework/h2/' + id); await st.waitForTimeout(1800);
    const passmark = await st.$('.og-passmark');
    await st.click('[data-start]'); await st.waitForTimeout(400);
    const kind = await st.getAttribute('.og', 'data-kind');
    if (kind === 'spin') console.log('spin: done button before spinning?', !!await st.$('[data-done]'));
    const g = find(id).own ? find(id) : null;
    await players[kind](st, (g || {}).own || {}, false, kind); await st.waitForTimeout(1500);
    console.log(id, kind, 'passmark shown?', !!passmark, 'end:', (await st.textContent('.og-end .og-title').catch(() => '?')).trim());
  }
  console.log(JSON.stringify(DB['progress/h2__sara@school.org'], null, 0));
  await st.goto('http://localhost:8784/#/homework'); await st.waitForTimeout(2000);
  console.log(await st.$$eval('.hw-game', a => a.map(x => x.className + ' | ' + x.textContent.replace(/\s+/g, ' ').trim())));
  console.log('errors', st.errs);
  await b.close();
})();
