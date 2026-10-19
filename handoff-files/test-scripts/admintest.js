const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost'},args:['--ignore-certificate-errors-spki-list='+process.env.SPKI]});
  const ctx = await b.newContext({viewport:{width:1500,height:950}, acceptDownloads:true});
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog', d => d.accept());
  const A='http://localhost:8777/admin.html';
  await p.goto(A); await p.waitForTimeout(2500);
  console.log('status:', await p.textContent('#status'), '| account btn:', await p.textContent('#btn-account'));
  const counts = async () => p.$$eval('.stripe-col h3 .n', e=>e.map(x=>x.textContent).join(','));
  console.log('white stripe counts:', await counts());
  await p.screenshot({path:'admin-games.png'});

  // drag first White S1 game to Stripe 2 top
  const first = await p.textContent('.rows[data-stripe="1"] .row:first-child .row-title');
  await p.dragAndDrop('.rows[data-stripe="1"] .row:first-child', '.rows[data-stripe="2"] .row:first-child', {targetPosition:{x:20,y:4}});
  await p.waitForTimeout(300);
  console.log('after drag counts:', await counts(), '| S2 first now:', await p.textContent('.rows[data-stripe="2"] .row:first-child .row-title'), '(moved:', first + ')');
  console.log('status after drag:', await p.textContent('#status'));

  // drag onto Red belt chip
  const moving = await p.textContent('.rows[data-stripe="3"] .row:first-child .row-title');
  await p.dragAndDrop('.rows[data-stripe="3"] .row:first-child', '.belt-chip[data-belt="red"]');
  await p.waitForTimeout(300);
  console.log('dropped on Red chip:', moving, '| toast:', await p.textContent('#toast'), '| white counts:', await counts());

  // edit a game: rename + hide
  await p.click('.rows[data-stripe="1"] .row:first-child [data-edit]');
  await p.fill('#dlg-game input[name=title]', 'Renamed Test Game');
  await p.check('#dlg-game input[name=hidden]');
  await p.click('#dlg-game [data-act=save]'); await p.waitForTimeout(200);
  console.log('after edit:', await p.textContent('.rows[data-stripe="1"] .row:first-child .row-title'), '| hidden badge:', await p.locator('.rows[data-stripe="1"] .row:first-child .badge').count());

  // add a game from iframe + image codes
  await p.click('[data-add="3"]');
  const code = `<iframe style="max-width:100%" src="https://wordwall.net/embed/0123456789abcdef0123456789abcdef?themeId=41&templateId=71&fontStackId=0" width="500" height="380" frameborder="0" allowfullscreen></iframe>
<a href="https://wordwall.net/resource/99999999/hebrew/test"><img src="https://screens.cdn.wordwall.net/200/0123456789abcdef0123456789abcdef_41" width="200" height="150"><span>Test Balloon Game Copy of someone</span></a>`;
  await p.fill('#dlg-add textarea[name=paste]', code);
  await p.dispatchEvent('#dlg-add textarea[name=paste]', 'input');
  console.log('parsed name:', await p.inputValue('#dlg-add input[name=title]'), '| type:', await p.inputValue('#dlg-add select[name=game]'), '| notes:', (await p.textContent('#dlg-add .found')).trim());
  await p.screenshot({path:'admin-add.png'});
  await p.click('#dlg-add [data-act=add]'); await p.waitForTimeout(200);
  console.log('added? last S3:', await p.textContent('.rows[data-stripe="3"] .row:last-child .row-title'));
  // duplicate warning
  await p.click('[data-add="1"]'); await p.fill('#dlg-add textarea[name=paste]', code); await p.dispatchEvent('#dlg-add textarea[name=paste]', 'input');
  console.log('dupe note:', (await p.textContent('#dlg-add .found')).includes('already on the site'));
  await p.click('#dlg-add button[value=cancel]');

  // words tab
  await p.click('[data-tab=words]'); await p.fill('input[data-text=headline]', 'Test headline from admin'); await p.dispatchEvent('input[data-text=headline]','input');
  await p.screenshot({path:'admin-words.png', fullPage:false});
  // how to tab
  await p.click('[data-tab=howto]'); await p.fill('input[data-howto="Balloon pop"]', 'Pop it!'); await p.dispatchEvent('input[data-howto="Balloon pop"]','input');
  // home tab
  await p.click('[data-tab=home]'); await p.uncheck('input[data-home=showStats]');
  await p.screenshot({path:'admin-home.png'});

  // preview
  const [pv] = await Promise.all([ctx.waitForEvent('page'), p.click('#btn-preview')]);
  await pv.waitForTimeout(2000);
  console.log('PREVIEW headline:', await pv.textContent('.hero h1'), '| bar:', await pv.locator('.preview-bar').count(), '| stats shown:', await pv.locator('.stats').count());
  await pv.goto('http://localhost:8777/?preview#/white/3'); await pv.waitForTimeout(800);
  console.log('PREVIEW white/3 has new game:', await pv.locator('.game-title', {hasText:'Test Balloon Game'}).count());
  await pv.goto('http://localhost:8777/?preview#/white/3/play/99999999'); await pv.waitForTimeout(500);
  console.log('PREVIEW how-to step 2:', await pv.$eval('.how-to li:nth-child(2)', e=>e.textContent));
  await pv.goto('http://localhost:8777/#/'); await pv.waitForTimeout(1200);
  console.log('LIVE site unchanged headline:', await pv.textContent('.hero h1'));
  await pv.close();

  // save without firebase -> setup dialog + download
  await p.click('#btn-save'); await p.waitForTimeout(300);
  console.log('setup dialog:', await p.textContent('#dlg-connect h2'));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#dlg-connect [data-act=download]')]);
  const path = await dl.path(); const data = JSON.parse(require('fs').readFileSync(path,'utf8'));
  console.log('download has new headline:', data.text.headline, '| games in white/3:', data.games.white['3'].length);
  await p.click('#dlg-connect button[value=ok]');
  // undo
  await p.click('#btn-discard'); await p.waitForTimeout(300);
  console.log('after undo status:', await p.textContent('#status'));
  console.log('errors:', errs);
  await b.close();
})();
