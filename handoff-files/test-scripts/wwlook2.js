// Layout reference only: how the Wordwall wheel and speaking cards behave after a spin / deal.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  await p.goto('https://wordwall.net/embed/ec21e735077343a2a00802021250633a?themeId=1', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(4000); await p.mouse.click(500, 340); await p.waitForTimeout(7000);
  await p.mouse.click(500, 653); await p.waitForTimeout(2000); await p.screenshot({ path: 'cmp/ww-spin-4.png' });
  await p.waitForTimeout(7000); await p.screenshot({ path: 'cmp/ww-spin-5.png' });
  await p.mouse.click(500, 340); await p.waitForTimeout(2000); await p.screenshot({ path: 'cmp/ww-spin-6.png' });
  await p.goto('https://wordwall.net/embed/19eb20aeef1640fd8fc4caf983abe098?themeId=2', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(4000); await p.screenshot({ path: 'cmp/ww-speak-1.png' });
  await p.mouse.click(500, 340); await p.waitForTimeout(7000); await p.screenshot({ path: 'cmp/ww-speak-2.png' });
  await b.close();
})();
