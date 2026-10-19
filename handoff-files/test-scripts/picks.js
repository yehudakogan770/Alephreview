const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await b.newPage({viewport:{width:1280,height:800}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const B='http://localhost:8771/';
  await p.goto(B); await p.waitForTimeout(500);
  console.log('tile animation:', await p.$eval('.tile', t=>getComputedStyle(t).animationName));
  const btn = p.locator('.hero .btn-primary'); const box = await btn.boundingBox();
  await p.mouse.move(box.x+10, box.y+10); await p.mouse.down(); await p.waitForTimeout(150);
  console.log('button scale while pressed:', await btn.evaluate(e=>getComputedStyle(e).scale));
  await p.mouse.up();
  await p.goto(B+'#/red'); await p.waitForTimeout(200);
  // earn White stripe 1 and check the star shines once
  const ids = await p.evaluate(()=>GAMES.white[1].filter(g=>!g.hidden).map(g=>g.id));
  await p.evaluate(ids=>{localStorage.setItem('played',JSON.stringify(ids));localStorage.removeItem('stars-shown');localStorage.setItem('celebrated','["white/1"]');}, ids);
  await p.goto(B+'#/'); await p.waitForTimeout(300);
  console.log('fresh stars on first view:', await p.locator('.star.fresh').count());
  await p.goto(B+'#/white'); await p.waitForTimeout(300);
  console.log('fresh stars on next page:', await p.locator('.star.fresh').count());
  console.log('errors', errs); await b.close();
})();
