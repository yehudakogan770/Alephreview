const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.goto('file://' + __dirname + '/guide/check.html'); await p.waitForTimeout(800);
  await p.pdf({ path: __dirname + '/Games-To-Check.pdf', format: 'Letter', printBackground: true, margin: { top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' },
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8px;color:#8a93a3;width:100%;text-align:center;font-family:sans-serif">Games copied from Wordwall: what to check · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>' });
  await b.close();
})();
