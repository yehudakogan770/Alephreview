const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  await p.route('https://firestore.googleapis.com/**', r => r.abort());
  await p.goto('http://localhost:8784/#/white/1/play/own-white-1'); await p.waitForTimeout(900);
  await p.click('[data-start]'); await p.waitForTimeout(800);
  await p.screenshot({ path: __dirname + '/font-game.png', clip: await (await p.$('#player')).boundingBox() });
  console.log(await p.evaluate(() => document.fonts.check('700 40px "Hebrew Bold Free"', 'א')));
  await b.close();
})();
