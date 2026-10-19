const { chromium } = require('playwright');
async function drag(p, from, to) {
  const a = await from.boundingBox(), z = await to.boundingBox();
  await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down();
  for (let k = 1; k <= 12; k++) await p.mouse.move(a.x + a.width / 2 + (z.x + z.width / 2 - a.x - a.width / 2) * k / 12, a.y + a.height / 2 + (z.y + z.height / 2 - a.y - a.height / 2) * k / 12);
  await p.mouse.up(); await p.waitForTimeout(150);
}
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const p = await b.newPage({ viewport: { width: 1366, height: 657 } });
  await p.route('https://firestore.googleapis.com/**', r => r.abort());
  p.on('pageerror', e => console.log('ERR', e.message));
  // order: drag the bottom item to the top
  await p.goto('http://localhost:8784/#/white/1/play/own-white-1-order'); await p.waitForTimeout(800); await p.click('[data-start]'); await p.waitForTimeout(300);
  const before = await p.$$eval('.og-rank-item', l => l.map(x => x.dataset.tile).join(''));
  const items = await p.$$('.og-rank-item'); await drag(p, items[items.length - 1], items[0]);
  const after = await p.$$eval('.og-rank-item', l => l.map(x => x.dataset.tile).join(''));
  console.log('order drag:', before, '->', after, after === before.slice(-1) + before.slice(0, -1) ? 'OK' : 'BAD');
  // sort: drag first pile tile into its bin
  await p.goto('http://localhost:8784/#/red/3/play/own-red-3-sort'); await p.waitForTimeout(800); await p.click('[data-start]'); await p.waitForTimeout(300);
  const t = await p.$('.og-pile .og-tile'); const txt = (await t.textContent()).trim();
  const gi = ['שׁ', 'שָׁ', 'שַׁ', 'שָׁם', 'שַׁבָּת'].includes(txt) ? 0 : 1;
  await drag(p, t, await p.$(`.og-bin[data-target="${gi}"]`));
  console.log('sort drag:', txt, 'in bin', gi, ':', await p.locator(`.og-bin[data-target="${gi}"] .og-tile`).count() === 1 ? 'OK' : 'BAD', '| dots', await p.$$eval('.og-dots i', l => l.map(x => x.className).join(',')));
  // anagram: drag a letter into the first slot
  await p.goto('http://localhost:8784/#/orange/2/play/own-orange-2-anagram'); await p.waitForTimeout(800); await p.click('[data-start]'); await p.waitForTimeout(300);
  await drag(p, await p.$('.og-letter-bank .og-tile'), await p.$('.og-slot'));
  console.log('anagram drag into slot:', await p.locator('.og-slot .og-tile').count() === 1 ? 'OK' : 'BAD');
  await p.screenshot({ path: 'drag-anagram.png' });
  await b.close();
})();
