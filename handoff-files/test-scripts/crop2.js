// Trims the white around the new logo and makes the white see-through.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage();
  const src = 'data:image/jpeg;base64,' + fs.readFileSync(process.argv[2]).toString('base64');
  const r = await p.evaluate(async src => {
    const i = new Image(); i.src = src; await i.decode();
    const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height); let minX = 1e9, minY = 1e9, maxX = 0, maxY = 0;
    for (let y = 0; y < c.height; y++) for (let X = 0; X < c.width; X++) { const k = (y * c.width + X) * 4;
      const m = Math.min(d.data[k], d.data[k + 1], d.data[k + 2]);
      if (m < 200) { minX = Math.min(minX, X); maxX = Math.max(maxX, X); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      // white → see-through, with soft edges
      if (m > 215) d.data[k + 3] = Math.round(255 * Math.max(0, (255 - m) / 40)); }
    x.putImageData(d, 0, 0);
    const pad = 8, w = maxX - minX + 1 + pad * 2, h = maxY - minY + 1 + pad * 2, W = 300, H = Math.round(W * h / w);
    const o = document.createElement('canvas'); o.width = W; o.height = H; const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high';
    ox.drawImage(c, minX - pad, minY - pad, w, h, 0, 0, W, H);
    return { url: o.toDataURL('image/png'), W, H, box: [minX, minY, maxX, maxY] };
  }, src);
  fs.writeFileSync('/home/user/Alephreview/img/ganeinu-academy-logo.png', Buffer.from(r.url.split(',')[1], 'base64'));
  console.log(r.W, r.H, r.box); await b.close();
})();
