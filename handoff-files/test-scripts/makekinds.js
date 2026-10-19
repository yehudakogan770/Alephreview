// Makes one game of each kind on the admin page (paste many), tries it, and plays it.
const { chromium } = require('playwright');
const { DB, browser } = require('./harness');
const { players, problems, bad, norm } = require('./players');
const B = 'http://localhost:8784/';
const PAIRS = 'א = Alef\nבּ = Beis\nב = Veis\nג = Gimmel\nד = Dalet\nה = Hey\nו = Vov';
const QUIZ = 'Which one is Beis? | בּ | ב, כ, פ\nWhich one is Gimmel? | ג | נ, ז\nWhat is this letter? ד | Dalet | Reish, Final Chaf';
const MAKE = (process.env.MAKE || 'Flip and match|pairs|' + PAIRS + '\nFind it|find|' + PAIRS + '\nRight or wrong|truefalse|' + PAIRS + '\nPick the answer|quiz|' + QUIZ + '\nGame show|gameshow|' + QUIZ + '\nWin or lose|winlose|' + QUIZ);
const LIST = [];
for (const block of MAKE.split(/\n(?=[A-Z][^|\n]*\|[a-z]+\|)/)) { const [name, kind, ...rest] = block.split('|'); LIST.push({ name, kind, text: rest.join('|') }); }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const t = await browser(b, { email: 'owner@example.org', displayName: 'Rabbi K' });
  await t.goto(B + 'admin.html'); await t.waitForTimeout(1800);
  for (const m of LIST) {
    await t.click('[data-make="1"]'); await t.waitForTimeout(300);
    await t.selectOption('#dlg-game select[name=kind]', m.name); await t.waitForTimeout(150);
    await t.fill('#dlg-game input[name=title]', 'Test ' + m.name);
    // empty save shows an error first
    await t.click('#dlg-game [data-act=save]'); await t.waitForTimeout(150);
    const err = norm(await t.textContent('#dlg-game .form-error'));
    await t.click('#dlg-game .paste-many summary');
    await t.fill('#dlg-game [data-paste]', m.text);
    await t.click('#dlg-game [data-apply-paste]'); await t.waitForTimeout(150);
    const rows = await t.locator('#dlg-game .content-row').count();
    if (m.kind === 'quiz') await t.screenshot({ path: 'make-quiz.png' });
    const [pv] = await Promise.all([t.context().waitForEvent('page'), t.click('#dlg-game [data-act=try]')]);
    pv.on('pageerror', e => bad(m.kind + ' preview error: ' + e.message));
    await pv.waitForTimeout(2000);
    const own = await pv.evaluate(id => { for (const b of Object.values(SITE.games)) for (const l of Object.values(b)) for (const g of l) if (g.id === id) return g.own; }, decodeURIComponent(pv.url().split('/play/')[1]));
    pv.setDefaultTimeout(8000);
    await pv.evaluate(o => { window.__own = o; }, own);
    await pv.click('[data-start]'); await pv.waitForTimeout(400);
    await players[m.kind](pv, own, false, m.kind);
    await pv.waitForTimeout(500);
    const score = ['spin', 'openbox', 'flip', 'deal'].includes(m.kind) ? norm(await pv.textContent('.og-end').catch(() => 'none')).replace('All done', '100% All done') : norm(await pv.textContent('.og-score').catch(() => 'none'));
    console.log(m.name, '| empty save:', err, '| rows:', rows, '| saved kind:', own && own.kind, '| score:', score);
    if (!score.startsWith('100%')) bad(m.name + ' ' + score);
    await pv.close();
  }
  console.log('admin errors:', t.errs, '\nPROBLEMS:', problems.length);
  await b.close();
})();
