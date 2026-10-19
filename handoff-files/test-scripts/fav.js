const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await b.newPage({viewport:{width:1200,height:300}});
  await p.goto('http://localhost:8765/#/red/2');
  for (const u of ['img/favicon.svg','img/favicon-32.png','img/apple-touch-icon.png']) { const r = await p.request.get('http://localhost:8765/'+u); console.log(u, r.status(), r.headers()['content-type']); }
  console.log('title:', await p.title()); console.log('brand:', await p.textContent('.brand-text'));
  await b.close();
})();
