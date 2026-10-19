const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  for (const [w,h] of [[1893,900],[1366,650],[1280,720],[1920,1080]]) {
    const p = await b.newPage({viewport:{width:w,height:h}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8780/#/red/1/play/94191495'); await p.waitForTimeout(5000);
    const r = await p.evaluate(()=>{const f=document.querySelector('.player iframe').getBoundingClientRect(); const bar=document.querySelector('.player-bar').getBoundingClientRect(); return {game:`${Math.round(f.width)}x${Math.round(f.height)}`, barBottom:Math.round(bar.bottom), howTo:!!document.querySelector('.how-to').offsetWidth};});
    console.log(`${w}x${h}`, r, r.barBottom<=h?'controls on screen':'controls BELOW', errs);
    if (w===1893) await p.screenshot({path:'frame-1893.png'});
    await p.close();
  }
  const p = await b.newPage({viewport:{width:1893,height:900}}); await p.goto('http://localhost:8780/#/red/1'); await p.waitForTimeout(500);
  console.log('stripe page width unchanged:', await p.$eval('#app', e=>Math.round(e.getBoundingClientRect().width)));
  await b.close();
})();
