const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  for (const [w,h] of [[1893,900],[1366,650],[1280,720]]) {
    const p = await b.newPage({viewport:{width:w,height:h}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8769/'); await p.waitForTimeout(2500);
    const r = await p.evaluate(()=>{const h=document.querySelector('.hero').getBoundingClientRect(); const s=document.querySelector('.stats').getBoundingClientRect(); return {heroBottom:Math.round(h.bottom), statsBottom:Math.round(s.bottom)};});
    console.log(`${w}x${h}`, r, r.heroBottom <= h ? 'FITS' : 'CUT OFF', errs);
    await p.screenshot({path:`fit-${w}.png`});
  }
  await b.close();
})();
