const { chromium } = require('playwright');
const BASE = process.env.BASE;
const problems = [];
const bad = m => { problems.push(m); console.log('PROBLEM:', m); };
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  const ctx = await b.newContext({viewport:{width:1200,height:900}});
  const p = await ctx.newPage();
  p.on('pageerror', e => bad('JS error: '+e.message));
  const failed = [];
  p.on('requestfailed', r => failed.push(r.url()+' '+r.failure().errorText));
  p.on('response', r => { if (r.status() >= 400) failed.push(r.status()+' '+r.url()); });

  // home
  await p.goto(BASE + '?t=' + Date.now()); await p.waitForTimeout(2000);
  console.log('title:', await p.title());
  const icons = await p.$$eval('link[rel*=icon]', ls => ls.map(l => l.href));
  for (const u of icons) { const r = await p.request.get(u); if (r.status() !== 200) bad('icon '+u+' '+r.status()); }
  console.log('icons ok:', icons.length);
  const belts = await p.$$eval('.belt-card', cs => cs.map(c => [c.getAttribute('href'), c.querySelector('.belt-meta').textContent]));
  console.log('belts:', belts.map(x => x.join(' ')).join(' | '));
  if (belts.length !== 10) bad('expected 10 belts, got '+belts.length);

  const GAMES = await p.evaluate(() => SITE.games);
  let games = 0, played = 0;
  for (const [href] of belts) {
    if (!href) continue;
    const key = href.slice(2);
    await p.goto(BASE + href); await p.waitForTimeout(300);
    const stripes = await p.$$('.stripe-card'); if (stripes.length !== 3) bad(key+': stripes '+stripes.length);
    for (const s of [1,2,3]) {
      await p.goto(BASE + `#/${key}/${s}`); await p.waitForTimeout(300);
      const expected = ((GAMES[key]||{})[s]||[]).filter(g=>!g.hidden);
      // all-games view
      await p.evaluate(() => { localStorage.setItem('view','"all"'); localStorage.setItem('filter','"all"'); });
      await p.goto(BASE + `#/${key}/${s}/`); await p.goto(BASE + `#/${key}/${s}`); await p.waitForTimeout(300);
      const n = await p.locator('.game-card').count();
      if (n !== expected.length) bad(`${key}/${s}: ${n} cards, expected ${expected.length}`);
      if (!expected.length) { if (!p.url().endsWith('#/'+key)) bad(`${key}/${s}: empty stripe did not redirect`); continue; }
      games += n;
      // pictures
      await p.$$eval('img', is => is.forEach(i => i.loading = 'eager'));
      await p.waitForTimeout(3000);
      const noPic = await p.$$eval('.game-card', cs => cs.filter(c => !(c.querySelector('img')?.naturalWidth)).map(c => c.querySelector('.game-title').textContent));
      noPic.forEach(t => bad(`${key}/${s}: no picture for "${t}"`));
      // filter chips
      const chips = await p.$$eval('.chip', cs => cs.map(c => [c.dataset.filter, +c.querySelector('.count').textContent]));
      for (const [f, cnt] of chips.slice(1)) {
        await p.click(`.chip[data-filter="${f}"]`); await p.waitForTimeout(100);
        const c = await p.locator('.game-card').count(); if (c !== cnt) bad(`${key}/${s} filter ${f}: ${c} vs ${cnt}`);
      }
      await p.click('.chip[data-filter="all"]');
      // by-type view
      await p.click('[data-view="type"]'); await p.waitForTimeout(150);
      const nt = await p.locator('.game-card').count(); if (nt !== n) bad(`${key}/${s} by-type: ${nt} vs ${n}`);
      await p.click('[data-view="all"]');
      // links
      const hrefs = await p.$$eval('.game-card', cs => cs.map(c => c.getAttribute('href')));
      hrefs.filter(h => !h.startsWith('#/')).forEach(h => bad(`${key}/${s}: card opens outside site ${h}`));
    }
  }
  console.log('games on stripe pages:', games);

  // play every game inside the site
  const frameFail = [];
  for (const key of Object.keys(GAMES)) for (const s of [1,2,3]) {
    const list = (GAMES[key][s]||[]).filter(g=>!g.hidden);
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      await p.goto(BASE + `#/${key}/${s}/play/${g.id}`);
      const fr = await p.waitForSelector('.player iframe', {timeout: 5000}).catch(()=>null);
      if (!fr) { bad(`${key}/${s} ${g.title}: no player`); continue; }
      const f = await fr.contentFrame();
      const ok = await f.waitForSelector('text=Powered by Wordwall', {timeout: 20000}).then(()=>true).catch(()=>false);
      const txt = ok ? '' : await f.evaluate(()=>document.body.innerText.slice(0,120)).catch(e=>'ERR');
      if (!ok) bad(`${key}/${s} "${g.title}": game did not load (${txt.replace(/\s+/g,' ')})`);
      played++;
      const hasPrev = await p.locator('a.btn:has-text("Previous")').count(), hasNext = await p.locator('a.btn:has-text("Next game")').count();
      if (hasPrev !== (i>0?1:0) || hasNext !== (i<list.length-1?1:0)) bad(`${key}/${s} ${g.title}: prev/next wrong`);
    }
  }
  console.log('games played in site:', played);

  // back button + played checks
  await p.goto(BASE + '#/red/1'); await p.waitForTimeout(300);
  console.log('played marks on red/1:', await p.locator('.game-card.played').count());

  // phone
  const m = await b.newPage({viewport:{width:390,height:800}});
  for (const h of ['', '#/white', '#/white/1', '#/white/1/play/38791608']) {
    await m.goto(BASE + h); await m.waitForTimeout(800);
    const w = await m.evaluate(() => document.documentElement.scrollWidth); if (w > 390) bad(`phone ${h||'home'}: sideways scroll ${w}px`);
  }
  await m.goto(BASE + '#/orange/2/play/94394474'); await m.waitForTimeout(5000); await m.screenshot({path:'live-phone.png'});
  await p.goto(BASE); await p.waitForTimeout(1500); await p.screenshot({path:'live-home.png'});

  const fl = [...new Set(failed)].filter(u => !/fonts\.g|google-analytics|googletagmanager|doubleclick|ERR_ABORTED/.test(u));
  if (fl.length) console.log('failed requests (sample):', fl.slice(0,15));
  console.log('\nTOTAL PROBLEMS:', problems.length);
  await b.close();
})();
