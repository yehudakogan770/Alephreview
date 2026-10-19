const { chromium } = require('playwright');
const fs = require('fs');
const { browser } = require('./harness');
const SPKI = fs.readFileSync(__dirname + '/spki.txt', 'utf8').trim();
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' }, args: ['--ignore-certificate-errors-spki-list=' + SPKI] });
  const t = await browser(b, { email: 'owner@example.org', displayName: 'Rabbi K' });
  if (process.argv[3]) {
    const old = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
    delete old.templates['Match it'];
    await t.context().addInitScript(d => { try { localStorage.setItem('admin-draft', d); } catch {} }, JSON.stringify(old));
  }
  t.setDefaultTimeout(8000);
  t.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await t.goto(process.argv[2] + 'admin.html'); await t.waitForTimeout(3000);
  console.log('make buttons:', await t.locator('[data-make]').count());
  await t.click('[data-make="1"]'); await t.waitForTimeout(800);
  console.log('dialog open:', await t.evaluate(() => document.querySelector('#dlg-game').open), '| errors:', t.errs);
  await t.screenshot({ path: 'makebtn.png' });
  console.log('game types in list:', await t.$$eval('#dlg-game select[name=kind] option', l => l.length));
  await t.keyboard.press('Escape');
  console.log('white 1 games in draft:', await t.evaluate(() => draft.games.white['1'].length), '| ready-made:', await t.evaluate(() => draft.games.white['1'].filter(g => g.id.startsWith('own-white-1')).length));
  await b.close();
})();
