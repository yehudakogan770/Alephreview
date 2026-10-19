// Screenshots of two Wordwall games, for comparing layout only (nothing saved into the site).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  for (const [name, e] of [['spin', 'ec21e735077343a2a00802021250633a?themeId=1'], ['speak', '19eb20aeef1640fd8fc4caf983abe098?themeId=2']]) {
    await p.goto('https://wordwall.net/embed/' + e, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log('goto', e.message));
    await p.waitForTimeout(5000);
    await p.screenshot({ path: `cmp/ww-${name}-1.png` });
    await p.mouse.click(500, 480); await p.waitForTimeout(4000);
    await p.screenshot({ path: `cmp/ww-${name}-2.png` });
    await p.mouse.click(500, 350); await p.waitForTimeout(7000);
    await p.screenshot({ path: `cmp/ww-${name}-3.png` });
  }
  await b.close();
})();
