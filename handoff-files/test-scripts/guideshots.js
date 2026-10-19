// Screenshots for the admin guide PDF. Uses the stand-in sign-in and database.
const { chromium } = require('playwright');
const fs = require('fs');
const { DB, browser } = require('./harness');
const OUT = __dirname + '/guide';
fs.mkdirSync(OUT, { recursive: true });
const B = 'http://localhost:8784/';
const shot = async (p, name, clip) => { await p.addStyleTag({ content: '.admin-toast, .toast { display: none !important; }' }).catch(() => {}); return p.screenshot({ path: `${OUT}/${name}.png`, ...(clip ? { clip } : {}) }); };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  // Signed out: the gate
  const g = await browser(b, null, { email: 'owner@example.org', displayName: 'Rabbi K' });
  await g.setViewportSize({ width: 1280, height: 760 });
  await g.goto(B + 'admin.html'); await g.waitForTimeout(1500);
  await shot(g, '01-signin');

  // Student site
  const s = await browser(b, null, null);
  await s.setViewportSize({ width: 1280, height: 800 });
  await s.goto(B); await s.waitForTimeout(1500);
  await shot(s, '02-home');
  await s.goto(B + '#/white/1'); await s.waitForTimeout(1200);
  await shot(s, '03-stripe');
  await s.goto(B + '#/white/1/play/own-white-1-ww32232123'); await s.waitForTimeout(1200);
  await shot(s, '04-game-start');
  await s.click('[data-start]'); await s.waitForTimeout(700);
  await shot(s, '05-game-play');

  // Admin, signed in
  const t = await browser(b, { email: 'owner@example.org', displayName: 'Rabbi K' });
  await t.setViewportSize({ width: 1400, height: 900 });
  t.on('dialog', d => d.accept());
  await t.goto(B + 'admin.html'); await t.waitForTimeout(2000);
  await shot(t, '10-games-tab');
  await t.click('[data-edit="own-white-1-ww32232123"]'); await t.waitForTimeout(400);
  await shot(t, '11-edit-made-here');
  await t.keyboard.press('Escape'); await t.waitForTimeout(200);
  await t.click('[data-edit="32232123"]'); await t.waitForTimeout(400);
  await shot(t, '12-edit-wordwall');
  await t.keyboard.press('Escape'); await t.waitForTimeout(200);
  await t.click('[data-make="1"]'); await t.waitForTimeout(400);
  await t.selectOption('#dlg-game select[name=kind]', 'Pick the answer'); await t.waitForTimeout(200);
  await t.fill('#dlg-game input[name=title]', 'Beis or Veis');
  await t.click('#dlg-game .paste-many summary');
  await t.fill('#dlg-game [data-paste]', 'Which one is Beis? | בּ | ב, כ\nWhich one is Veis? | ב | בּ, פ');
  await t.click('#dlg-game [data-apply-paste]'); await t.waitForTimeout(300);
  await shot(t, '13-make-game');
  await t.keyboard.press('Escape'); await t.waitForTimeout(200);
  await t.click('[data-add="1"]'); await t.waitForTimeout(400);
  await shot(t, '14-add-wordwall');
  await t.keyboard.press('Escape'); await t.waitForTimeout(200);
  for (const [tab, name] of [['words', '20-words'], ['howto', '21-howto'], ['home', '22-home'], ['admins', '40-admins']]) {
    await t.click(`[data-tab="${tab}"]`); await t.waitForTimeout(600);
    await shot(t, name);
  }
  // Homework: a class, a homework, some results
  await t.click('[data-tab="homework"]'); await t.waitForTimeout(500);
  await t.click('[data-class-new]'); await t.waitForTimeout(200);
  await t.fill('#dlg-hw input[name=name]', 'Grade 1');
  await t.fill('#dlg-hw textarea[name=students]', 'sara@school.org\ndov@school.org\nmiri@school.org');
  await shot(t, '31-class');
  await t.click('#dlg-hw [data-act=save]'); await t.waitForTimeout(500);
  await t.click('[data-hw-new]'); await t.waitForTimeout(300);
  await t.fill('#dlg-hw input[name=title]', 'Bet and Vet');
  await t.fill('#dlg-hw input[name=due]', '2026-10-05');
  await t.fill('#dlg-hw [data-search]', 'Bet'); await t.waitForTimeout(300);
  await t.click('#dlg-hw [data-pick] >> nth=0'); await t.waitForTimeout(150);
  await t.click('#dlg-hw [data-pick] >> nth=0'); await t.waitForTimeout(150);
  await shot(t, '32-homework-new');
  await t.click('#dlg-hw [data-act=save]'); await t.waitForTimeout(500);
  // pretend two students played
  const hw = Object.entries(DB).find(([p]) => p.startsWith('homework/'));
  const hwId = hw[0].split('/')[1];
  const items = hw[1].items.map(i => i.game);
  DB[`progress/${hwId}__sara@school.org`] = { hw: hwId, email: 'sara@school.org', name: 'Sara Cohen', items: { [items[0]]: { opened: 1, seconds: 140, best: 100, last: 100, tries: 1, passed: true }, [items[1]]: { opened: 1, seconds: 200, best: 90, last: 90, tries: 2, passed: true } } };
  DB[`progress/${hwId}__dov@school.org`] = { hw: hwId, email: 'dov@school.org', name: 'Dov Levi', items: { [items[0]]: { opened: 1, seconds: 95, best: 60, last: 60, tries: 1, passed: false } } };
  await t.click('[data-tab="games"]'); await t.waitForTimeout(300);
  await t.click('[data-tab="homework"]'); await t.waitForTimeout(800);
  await shot(t, '30-homework-tab');
  await t.click('[data-hw-results]'); await t.waitForTimeout(800);
  await shot(t, '33-results');
  await t.keyboard.press('Escape');

  // Student homework page, signed in
  const st = await browser(b, { email: 'sara@school.org', displayName: 'Sara Cohen' });
  await st.setViewportSize({ width: 1280, height: 760 });
  await st.goto(B + '#/homework'); await st.waitForTimeout(2000);
  await shot(st, '34-student-homework');

  console.log('errors', g.errs, s.errs, t.errs, st.errs);
  await b.close();
})();
