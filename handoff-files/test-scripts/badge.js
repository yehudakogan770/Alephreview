const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext();
  await ctx.addInitScript(() => localStorage.setItem('played', JSON.stringify(['32232123', 'own-white-1'])));
  await ctx.route('https://firestore.googleapis.com/**', r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8784/'); await p.waitForTimeout(1500);
  console.log('badge:', await p.textContent('#played-count'));
  await b.close();
})();
