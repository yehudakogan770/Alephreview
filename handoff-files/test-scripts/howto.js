const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  const B='http://localhost:8774/';
  const errs=[];
  for (const [w,h,f,g] of [[1893,900,'howto-wide.png','#/orange/1/play/62269918'],[1280,720,'howto-1280.png','#/red/1/play/94191495'],[900,800,'howto-narrow.png','#/white/1/play/32232123']]) {
    const p = await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
    await p.goto(B+g); await p.waitForTimeout(6000);
    const r = await p.evaluate(()=>{const q=s=>document.querySelector(s)?.getBoundingClientRect(); const bar=q('.player-bar'); return {barBottom:Math.round(bar.bottom), howTo:!!q('.how-to'), steps:document.querySelectorAll('.how-to li').length, tip:document.querySelector('.how-to .tip')?.textContent||''};});
    console.log(`${w}x${h}`, r, r.barBottom<=h?'controls on screen':'controls BELOW screen');
    await p.screenshot({path:f}); await p.close();
  }
  // every game has a How-to line
  const p = await b.newPage(); await p.goto(B); await p.waitForTimeout(300);
  const missing = await p.evaluate(()=>{const out=[]; for (const k in GAMES) for (const s in GAMES[k]) for (const g of GAMES[k][s]) if(!g.hidden && !HOW_TO[g.game]) out.push(g.title+' ('+g.game+')'); return out;});
  console.log('games without a how-to line:', missing, 'errors:', errs);
  await b.close();
})();
