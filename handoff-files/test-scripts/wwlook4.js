// Layout reference only: Wordwall speaking cards after Deal.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  await p.goto('https://wordwall.net/embed/04279e6815d343efabf345970ba79373?themeId=42', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(5000); await p.mouse.click(500, 340); await p.waitForTimeout(12000); await p.screenshot({ path: 'cmp/ww-speak-5.png' });
  await p.mouse.click(700, 653); await p.waitForTimeout(3000); await p.screenshot({ path: 'cmp/ww-speak-6.png' });
  await p.mouse.click(700, 653); await p.waitForTimeout(3000); await p.screenshot({ path: 'cmp/ww-speak-7.png' });
  await b.close();
})();
