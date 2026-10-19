const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await b.newPage({viewport:{width:1280,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const B='http://localhost:8768/';
  await p.goto(B); await p.waitForTimeout(500);
  const GAMES = await p.evaluate(() => GAMES);
  const empty = (belt, s) => !((GAMES[belt]||{})[s]||[]).filter(g=>!g.hidden).length;
  const emptyBelt = belt => [1,2,3].every(s => empty(belt, s));
  const pages = [''];
  for (const k of ['white','red','orange','yellow','green','blue','purple','brown','gray','black']) { pages.push('#/'+k); for (const s of [1,2,3]) pages.push(`#/${k}/${s}`); }
  let bad = 0;
  for (const h of pages) {
    await p.goto(B+h); await p.waitForTimeout(80);
    const hrefs = await p.$$eval('a[href^="#/"]', as => as.map(a => a.getAttribute('href')));
    for (const href of hrefs) {
      const [belt, s, act] = href.slice(2).split('/');
      if (!belt || act) continue;
      if ((s && empty(belt, +s) && href !== h) || (!s && emptyBelt(belt))) { console.log('clickable coming-soon link on', h||'home', '->', href); bad++; }
    }
  }
  // click a coming-soon belt card and an empty stripe card
  await p.goto(B); await p.click('.belt-card.soon >> nth=0'); await p.waitForTimeout(200); console.log('after clicking Yellow card:', p.url());
  await p.goto(B+'#/orange'); await p.click('.stripe-card.soon'); await p.waitForTimeout(200); console.log('after clicking Orange stripe 3:', p.url());
  await p.goto(B+'#/orange/1'); await p.click('.seg[aria-disabled]'); await p.waitForTimeout(200); console.log('after clicking disabled Stripe 3 tab:', p.url());
  console.log('open belt cards clickable:', await (async()=>{await p.goto(B); return p.locator('a.belt-card').count();})());
  await p.goto(B+'#/orange'); await p.waitForTimeout(300); await p.screenshot({path:'soon-orange.png'});
  console.log('bad links:', bad, 'errors:', errs); await b.close();
})();
