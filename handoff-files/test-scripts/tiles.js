const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  const B='http://localhost:8773/';
  for (const [w,h] of [[1893,900],[1280,720]]) {
    const p = await b.newPage({viewport:{width:w,height:h}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto(B); await p.waitForTimeout(2500);
    const rows = await p.$$eval('.tile', ts => { const m={}; ts.forEach(t=>{const r=t.getBoundingClientRect(); const y=Math.round(r.top/20); (m[y]=m[y]||[]).push([r.left,t.textContent]);}); return Object.values(m).map(r=>r.sort((a,b)=>b[0]-a[0]).map(x=>x[1]).join(' ')); });
    const hb = await p.$eval('.hero', e=>Math.round(e.getBoundingClientRect().bottom));
    console.log(`${w}x${h}`, 'rows (right→left):', rows, 'hero bottom', hb, hb<=h?'FITS':'CUT', errs);
    if (w===1893) await p.screenshot({path:'tiles-home.png'}); console.log('colors:', await p.$$eval('.tile', ts=>ts.map(t=>t.textContent+'='+(t.title||'').split(' ')[0]).join(' ')));
    await p.close();
  }
  const p = await b.newPage({viewport:{width:1280,height:800}});
  for (const [letter, what] of [["א","white"],["ב","red"],["ג","orange"],["ד","yellow, coming soon"],["ט","gray, coming soon"]]) {
    await p.goto(B); await p.waitForTimeout(300);
    await p.locator(`.tile:has-text("${letter}")`).click({force:true}); await p.waitForTimeout(300);
    console.log(`press ${letter} (${what}) ->`, p.url().replace(B,'') || '(stayed home)');
  }
  await p.goto(B); console.log('clickable tiles:', await p.locator('a.tile').count());
  await b.close();
})();
