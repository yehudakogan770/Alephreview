// Reads one Wordwall game's content by its number (for the game saved without an embed link).
const { chromium } = require('playwright');
const fs = require('fs');
const SPKI = fs.readFileSync(__dirname + '/spki.txt', 'utf8').trim();
const id = process.argv[2];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors-spki-list=' + SPKI] });
  const req = (await b.newContext()).request;
  const html = await (await req.get(process.argv[3] ? 'https://wordwall.net/embed/' + process.argv[3] : 'https://wordwall.net/resource/' + id)).text();
  const guid = (html.match(/"activityGuid":"([0-9a-f]{32})"/) || html.match(/embed\/([0-9a-f]{32})/) || [])[1];
  const author = (html.match(/"authorUserId":(\d+)/) || [])[1];
  const tmpl = (html.match(/"templateId":(\d+)/) || [])[1];
  const title = (html.match(/"activityTitle":"([^"]*)"/) || [])[1];
  console.log({ guid, author, tmpl, title });
  if (guid && author) {
    const r = await req.get(`https://user.cdn.wordwall.net/content-models/${author}/${guid}.json`);
    console.log('content', r.status());
    if (r.ok()) {
      const content = await r.json();
      fs.writeFileSync(`${__dirname}/wwcontent/${id}.json`, JSON.stringify({ belt: 'white', stripe: '1', id, title: 'What is the order? Alef - Vav Match', game: null, page: { templateId: Number(tmpl), authorUserId: Number(author), activityGuid: guid }, content }, null, 1));
      console.log(JSON.stringify(content).slice(0, 600));
    }
  }
  await b.close();
})();
