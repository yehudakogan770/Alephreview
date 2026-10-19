// Opens recreated games in the admin maker, saves them unchanged, and checks nothing was lost.
const { chromium } = require('playwright');
const fs = require('fs');
const { browser } = require('./harness');
const SPKI = fs.readFileSync(__dirname + '/spki.txt', 'utf8').trim();
const IDS = [['red', 'own-red-1-ww12799768'], ['orange', 'own-orange-2-ww62271598'], ['orange', 'own-orange-2-ww94350205'], ['white', 'own-white-2-ww39044626'], ['orange', 'own-orange-1-ww72335846'.replace('orange-1', 'red-1')]];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors-spki-list=' + SPKI] });
  const t = await browser(b, { email: 'owner@example.org', displayName: 'Rabbi K' });
  t.setDefaultTimeout(8000);
  await t.goto('http://localhost:8784/admin.html'); await t.waitForTimeout(2000);
  for (const [belt, id] of [['red', 'own-red-1-ww12799768'], ['orange', 'own-orange-2-ww62271598'], ['orange', 'own-orange-2-ww94350205'], ['white', 'own-white-2-ww39044626'], ['red', 'own-red-1-ww72335846'], ['orange', 'own-orange-1-ww94341936'], ['orange', 'own-orange-2-ww94381851'], ['red', 'own-red-3-ww5939727']]) {
    await t.click(`[data-belt="${belt}"]`).catch(() => {}); await t.waitForTimeout(300);
    const before = await t.evaluate(id => JSON.stringify(findGame(id).game.own), id);
    await t.click(`[data-edit="${id}"]`); await t.waitForTimeout(300);
    const rows = await t.locator('#dlg-game .content-row').count();
    const help = await t.textContent('#dlg-game [data-kind-help]');
    await t.click('#dlg-game [data-act=save]'); await t.waitForTimeout(300);
    const err = await t.evaluate(() => { const e = document.querySelector('#dlg-game .form-error'); return e && !e.hidden ? e.textContent : ''; });
    if (err) { console.log(id, 'SAVE ERROR:', err); await t.keyboard.press('Escape'); continue; }
    const after = await t.evaluate(id => JSON.stringify(findGame(id).game.own), id);
    const a = JSON.parse(before), z = JSON.parse(after);
    delete a.theme; delete z.theme;
    const sortK = o => Array.isArray(o) ? o.map(sortK) : o && typeof o === 'object' ? Object.fromEntries(Object.keys(o).sort().map(k => [k, sortK(o[k])])) : o;
    Object.assign(a, {}); const A = sortK(a), Z = sortK(z);
    console.log(id, '| rows', rows, '| same after save:', JSON.stringify(A) === JSON.stringify(Z), '|', help.slice(0, 60));
    if (JSON.stringify(A) !== JSON.stringify(Z)) console.log('  before', JSON.stringify(a).slice(0, 300), '\n  after ', JSON.stringify(z).slice(0, 300));
  }
  console.log('errors', t.errs);
  await b.close();
})();
