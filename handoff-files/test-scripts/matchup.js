const { chromium } = require('playwright');
const site = require('/home/user/Alephreview/data/site.json');
const B = 'http://localhost:8784/';
function draftWith(theme) {
  const d = JSON.parse(JSON.stringify(site));
  d.games.white['1'].unshift({ id: 'own-test', title: 'Letters and names', type: 'match', game: 'Match it',
    own: { kind: 'match', theme, pairs: [['א','Aleph'],['בּ','Bet'],['ב','Vet'],['ג','Gimmel'],['ד','Dalet'],['ה','Hey'],['ו','Vav'],['ז','Zayin']].map(([a,b])=>({a,b})) } });
  return d;
}
async function drag(p, from, to) {
  const a = await from.boundingBox(), z = await to.boundingBox();
  await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down();
  for (let k = 1; k <= 10; k++) await p.mouse.move(a.x + a.width / 2 + (z.x + z.width / 2 - a.x - a.width / 2) * k / 10, a.y + a.height / 2 + (z.y + z.height / 2 - a.y - a.height / 2) * k / 10);
  await p.mouse.up(); await p.waitForTimeout(120);
}
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' }, args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  for (const theme of ['meadow', 'desert', 'ocean', 'space', 'classic']) {
    const ctx = await b.newContext({ viewport: { width: 1893, height: 900 } });
    await ctx.addInitScript(d => localStorage.setItem('admin-draft', d), JSON.stringify(draftWith(theme)));
    await ctx.route('https://firestore.googleapis.com/**', r => r.abort());
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(B + '?preview#/white/1/play/own-test'); await p.waitForTimeout(1500);
    if (theme === 'meadow') await p.screenshot({ path: `mu-start.png` });
    await p.click('[data-start]'); await p.waitForTimeout(500);
    if (theme !== 'meadow') { await p.screenshot({ path: `mu-${theme}.png` }); await ctx.close(); continue; }
    await p.screenshot({ path: 'mu-round.png' });
    // round 1: drag every tile to its box, but put the first two swapped (1 swap = 2 wrong)
    const boxes = await p.$$('.og-box');
    const targets = await Promise.all(boxes.map(x => x.getAttribute('data-target')));
    for (let k = 0; k < boxes.length; k++) {
      let want = targets[k];
      if (k === 0) want = targets[1]; if (k === 1) want = targets[0];
      const tile = await p.$(`.og-bank .og-tile[data-tile="${want}"]`);
      await drag(p, tile, boxes[k]);
    }
    console.log('filled boxes:', await p.locator('.og-box .og-tile').count(), 'of', boxes.length, '| bank left:', await p.locator('.og-bank .og-tile').count());
    // fix: tap-swap one of the wrong ones back? keep 2 wrong. Move one tile back to bank and back again to test bank drop
    const t0 = await p.$('.og-box >> nth=2 >> .og-tile');
    await drag(p, t0, await p.$('.og-bank'));
    console.log('after dragging one back to bank, bank has:', await p.locator('.og-bank .og-tile').count());
    await drag(p, await p.$('.og-bank .og-tile'), await p.$('.og-box >> nth=2'));
    await p.screenshot({ path: 'mu-filled.png' });
    await p.click('[data-submit]'); await p.waitForTimeout(600);
    console.log('round 1 marks:', await p.$$eval('.og-mark', l => l.map(x => x.textContent).join(' ')), '| dots:', await p.locator('.og-dots i').count());
    await p.screenshot({ path: 'mu-submitted.png' });
    await p.click('[data-continue]'); await p.waitForTimeout(500);
    console.log('round:', await p.textContent('[data-round]'));
    // round 2: test tap-to-place, all correct
    for (const box of await p.$$('.og-box')) {
      const want = await box.getAttribute('data-target');
      await (await p.$(`.og-bank .og-tile[data-tile="${want}"]`)).click(); await box.click(); await p.waitForTimeout(100);
    }
    await p.click('[data-submit]'); await p.waitForTimeout(500); await p.click('[data-continue]'); await p.waitForTimeout(900);
    console.log('end:', (await p.textContent('.og-end')).replace(/\s+/g, ' ').trim());
    await p.screenshot({ path: 'mu-end.png' });
    await p.click('[data-reveal]'); await p.waitForTimeout(400);
    console.log('answers shown:', await p.locator('.og-answer-list li').count());
    await p.screenshot({ path: 'mu-answers.png' });
    // empty submit warning
    await p.click('[data-again]'); await p.waitForTimeout(400); await p.click('[data-submit]'); await p.waitForTimeout(200);
    console.log('empty submit asks first:', await p.textContent('[data-submit]'));
    console.log('errors:', errs);
    await ctx.close();
  }
  await b.close();
})();
