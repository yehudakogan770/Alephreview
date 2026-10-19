const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const svg = fs.readFileSync('/home/user/Alephreview/img/favicon.svg','utf8');
  for (const [size, out, pad] of [[32,'favicon-32.png',false],[180,'apple-touch-icon.png',true]]) {
    const p = await b.newPage({viewport:{width:size,height:size}});
    // apple-touch icons get square corners; iOS rounds them itself
    const s = pad ? svg.replace('rx="16"','rx="0"') : svg;
    await p.setContent(`<style>html,body{margin:0;background:transparent}</style>${s.replace('<svg ','<svg width="'+size+'" height="'+size+'" ')}`);
    await p.screenshot({path:'/home/user/Alephreview/img/'+out, omitBackground:true});
  }
  await b.close();
})();
