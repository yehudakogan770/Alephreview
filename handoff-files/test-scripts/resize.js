const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage();
  const src = 'data:image/png;base64,' + fs.readFileSync(__dirname + '/g-logo-big.png').toString('base64');
  const out = await p.evaluate(async src => { const i = new Image(); i.src = src; await i.decode(); const c = document.createElement('canvas'); c.width = 600; c.height = Math.round(600 * i.height / i.width); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, c.width, c.height); return c.toDataURL('image/png'); }, src);
  fs.writeFileSync('/home/user/Alephreview/img/ganeinu-academy.png', Buffer.from(out.split(',')[1], 'base64')); await b.close();
})();
