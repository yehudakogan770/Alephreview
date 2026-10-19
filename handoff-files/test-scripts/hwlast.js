const { chromium } = require('playwright');
const { DB, browser } = require('./harness');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  DB['homework/h1'] = { title: 'Test', students: ['sara@school.org'], pass: 80, items: [{ game: 'own-white-1' }, { game: 'own-white-1-order' }] };
  const st = await browser(b, { email: 'sara@school.org', displayName: 'Sara Cohen' });
  await st.setViewportSize({ width: 1280, height: 760 });
  for (const g of ['own-white-1', 'own-white-1-order']) {
    await st.goto('http://localhost:8784/#/homework/h1/' + g); await st.waitForTimeout(2000);
    console.log(g, await st.textContent('.how-to li:last-child'), JSON.stringify(await st.$$eval('.player-head a.btn, .player-head span.btn', a => a.map(x => x.textContent.trim()))));
  }
  await st.screenshot({ path: 'hwlast.png', clip: { x: 0, y: 0, width: 1280, height: 200 } });
  console.log('errors', st.errs);
  await b.close();
})();
