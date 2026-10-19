const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 816, height: 1056 } });
  await p.emulateMedia({ media: 'print' });
  await p.goto('file://' + __dirname + '/guide/guide.html'); await p.waitForTimeout(800);
  const h = await p.evaluate(() => document.body.scrollHeight);
  console.log('height', h);
  for (const [i, y] of [[1, 0], [2, 2400], [3, 5200], [4, 9000]]) await p.screenshot({ path: `glook${i}.png`, fullPage: true, clip: { x: 0, y, width: 816, height: 1300 } });
  await b.close();
})();
