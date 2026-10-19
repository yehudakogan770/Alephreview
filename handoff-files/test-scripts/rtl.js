const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  for (const [w,h,f] of [[1280,720,'rtl-desk.png'],[390,500,'rtl-phone.png']]) {
    const p = await b.newPage({viewport:{width:w,height:h}});
    await p.goto('http://localhost:8768/'); await p.waitForTimeout(2000);
    const order = await p.$$eval('.tile', ts => ts.map(t => [t.textContent, Math.round(t.getBoundingClientRect().left)]).sort((a,b)=>b[1]-a[1]).map(x=>x[0]).join(''));
    console.log(w, 'right-to-left reading of tiles:', order);
    await p.screenshot({path:f});
  }
  await b.close();
})();
