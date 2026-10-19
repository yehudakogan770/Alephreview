// Reads each Wordwall game's content (the owner has permission to recreate them).
// For each game in data/site.json that has an embed: load the embed page, read
// pageData (author, guid, template), then download the content-model JSON.
// Nothing is played. Saves wwcontent/<id>.json.
const { chromium } = require('playwright');
const fs = require('fs');
const SPKI = fs.readFileSync(__dirname + '/spki.txt', 'utf8').trim();
const site = JSON.parse(fs.readFileSync('/home/user/Alephreview/data/site.json', 'utf8'));
const out = __dirname + '/wwcontent';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors-spki-list=' + SPKI] });
  const ctx = await b.newContext();
  const req = ctx.request;
  let ok = 0, bad = 0;
  for (const [belt, stripes] of Object.entries(site.games)) for (const [s, list] of Object.entries(stripes)) for (const g of list) {
    if (g.own) continue;
    const file = `${out}/${g.id}.json`;
    if (fs.existsSync(file)) { ok++; continue; }
    if (!g.embed) { console.log('no embed', g.id, g.title); bad++; continue; }
    try {
      const html = await (await req.get('https://wordwall.net/embed/' + g.embed)).text();
      const m = html.match(/window\.pageData=(\{.*?\});<\/script>/);
      const pd = JSON.parse(m[1]);
      const url = `https://user.cdn.wordwall.net/content-models/${pd.authorUserId}/${pd.activityGuid}.json`;
      const r = await req.get(url);
      if (!r.ok()) throw new Error('content ' + r.status());
      const content = await r.json();
      fs.writeFileSync(file, JSON.stringify({ belt, stripe: s, id: g.id, title: g.title, game: g.game, page: pd, content }, null, 1));
      ok++;
    } catch (e) { console.log('FAIL', g.id, g.title, e.message.slice(0, 120)); bad++; }
    await new Promise(r => setTimeout(r, 400));
  }
  console.log('saved', ok, 'failed', bad);
  await b.close();
})();
