// Opens one Wordwall embed, presses Start, and lists where its pictures and sounds load from.
const { chromium } = require('playwright');
const fs = require('fs');
const SPKI = fs.readFileSync(__dirname + '/spki.txt', 'utf8').trim();
const embed = process.argv[2];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors-spki-list=' + SPKI, '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  const seen = [];
  p.on('request', r => {
    const u = r.url();
    if (/user\.cdn|\/tts\/|\.mp3/.test(u)) seen.push(r.method() + ' ' + u.slice(0, 220));
  });
  await p.goto('https://wordwall.net/embed/' + embed);
  await p.waitForTimeout(8000);
  await p.mouse.click(640, 350);
  await p.waitForTimeout(8000);
  await p.screenshot({ path: __dirname + '/wwnet.png' });
  console.log(seen.join('\n'));
  await b.close();
})();
