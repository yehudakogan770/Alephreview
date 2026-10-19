// Downloads every picture and sound used by the saved Wordwall games into
// the site's media/ww folder. Names: pictures <user>-<guid>-<n>.<ext>, sounds <hash>.mp3.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const SPKI = fs.readFileSync(__dirname + '/spki.txt', 'utf8').trim();
const dir = __dirname + '/wwcontent';
const out = '/home/user/Alephreview/media/ww';
fs.mkdirSync(out, { recursive: true });

const imgs = new Set(), snds = new Set();
function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') {
    if (typeof o.image === 'string' && o.image) imgs.add(o.image);
    if (typeof o.sound === 'string' && o.sound) snds.add(o.sound);
    Object.values(o).forEach(walk);
  }
}
for (const f of fs.readdirSync(dir)) walk(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).content);
console.log('pictures', imgs.size, 'sounds', snds.size);

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors-spki-list=' + SPKI] });
  const req = (await b.newContext()).request;
  const map = {};
  let n = 0, fail = 0;
  for (const img of imgs) {
    const name = img.replace(/^user\//, '').replace(/[^\w-]/g, '-');
    const have = fs.readdirSync(out).find(x => x.startsWith(name + '.'));
    if (have) { map[img] = have; continue; }
    try {
      const r = await req.get('https://user.cdn.wordwall.net/content-images/' + img);
      if (!r.ok()) throw new Error(r.status());
      const ext = EXT[(r.headers()['content-type'] || '').split(';')[0]] || 'png';
      fs.writeFileSync(`${out}/${name}.${ext}`, await r.body());
      map[img] = `${name}.${ext}`; n++;
    } catch (e) { console.log('FAIL image', img, e.message); fail++; }
  }
  for (const s of snds) {
    const name = s.replace(/^\//, '').replace(/\.mp3$/, '').replace(/[^\w-]/g, '-') + '.mp3';
    if (fs.existsSync(`${out}/${name}`)) { map[s] = name; continue; }
    try {
      const r = await req.get('https://user.cdn.wordwall.net/content-sounds' + s.replace(/\.mp3$/, '_64.mp3'));
      if (!r.ok()) throw new Error(r.status());
      fs.writeFileSync(`${out}/${name}`, await r.body());
      map[s] = name; n++;
    } catch (e) { console.log('FAIL sound', s, e.message); fail++; }
  }
  fs.writeFileSync(__dirname + '/wwmedia-map.json', JSON.stringify(map, null, 1));
  console.log('downloaded', n, 'failed', fail);
  await b.close();
})();
