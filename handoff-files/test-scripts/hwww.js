const { chromium } = require('playwright');
const { DB, browser } = require('./harness');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  DB['homework/h1'] = { title: 'Test', students: ['sara@school.org'], pass: 80, items: [{ game: 'own-white-1' }, { game: '27259465' }] };
  const st = await browser(b, { email: 'sara@school.org', displayName: 'Sara Cohen' });
  await st.setViewportSize({ width: 1280, height: 760 });
  for (const g of ['own-white-1', '27259465']) {
    await st.goto('http://localhost:8784/#/homework/h1/' + g); await st.waitForTimeout(2000);
    console.log(g, await st.textContent('.how-to li:last-child'), JSON.stringify(await st.$$eval('.player-head a.btn, .player-head span.btn', a => a.map(x => x.textContent.trim()))));
  }
  console.log('own game?', !!await st.$('.og'), 'iframe?', !!await st.$('.player iframe'));
  await st.goto('http://localhost:8784/#/homework'); await st.waitForTimeout(1500);
  console.log(await st.$$eval('.hw-name', a => a.map(x => x.textContent)));
  await st.screenshot({ path: 'hwww.png', clip: { x: 0, y: 0, width: 1280, height: 200 } });
  console.log('errors', st.errs);
  await b.close();
})();
