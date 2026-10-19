const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await b.newPage({viewport:{width:1893,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const B='http://localhost:8775/';
  await p.goto(B); await p.waitForTimeout(500);
  console.log('HOME:', await p.$eval('.hero .lede', e=>e.textContent), '|', await p.$eval('.hero-next', e=>e.textContent), '|', await p.$eval('#belts p', e=>e.textContent), '| hero fits:', await p.$eval('.hero', e=>e.getBoundingClientRect().bottom) <= 900);
  await p.goto(B+'#/red'); await p.waitForTimeout(200); console.log('BELT:', await p.$eval('.page-head-sub', e=>e.textContent));
  await p.goto(B+'#/orange/1/play/62269918'); await p.waitForTimeout(300); console.log('GAME:', (await p.$$eval('.how-to li', ls=>ls.map(l=>l.textContent))).join(' / '));
  await p.goto(B+'#/orange/1/play/94342421'); await p.waitForTimeout(300); console.log('LAST GAME:', (await p.$$eval('.how-to li', ls=>ls.map(l=>l.textContent))).join(' / '));
  console.log('FOOTER:', await p.$eval('.footer-inner > span:last-child', e=>e.textContent), 'errors:', errs);
  await b.close();
})();
