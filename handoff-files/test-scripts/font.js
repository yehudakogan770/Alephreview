const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' }, args: ['--ignore-certificate-errors-spki-list=' + process.env.SPKI] });
  const p = await b.newPage({ viewport: { width: 1000, height: 300 } });
  await p.goto('http://localhost:8784/'); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.body.innerHTML = ['Fredoka','Rubik'].map(f => `<div style="font:700 90px '${f}'">${f[0]}: ד ר ך ז ו ן</div>`).join(''); });
  await p.waitForTimeout(800); await p.screenshot({ path: 'font.png' }); await b.close();
})();
