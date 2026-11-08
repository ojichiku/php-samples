const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const output=process.env.TEST_ARTIFACT_DIR || path.join(root,'test-results/browser/date-tools');
fs.mkdirSync(output,{recursive:true});
const origin=process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
const remote=!['localhost','127.0.0.1'].includes(new URL(origin).hostname);
if(remote && process.env.ALLOW_REMOTE_TESTS!=='1') throw new Error('Remote verification requires ALLOW_REMOTE_TESTS=1');
(async()=>{
 const browser=await chromium.launch({headless:true});const report=[];
 try{
 for(const width of [320,375,768,1280]){
  const context=await browser.newContext({viewport:{width,height:1000},timezoneId:'Asia/Tokyo',locale:'ja-JP',permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith(origin))external.push(r.url());});
  await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await page.goto(origin+'/');
  await page.getByRole('link',{name:'日付・元号を調べる',exact:false}).click();
  assert.equal(new URL(page.url()).pathname,new URL(origin+'/date-tools').pathname);
  await page.locator('#western-date').waitFor();
  assert.equal(await page.locator('.site-header nav a[aria-current="page"]').innerText(),'日付・元号');
  assert.equal(await page.locator('.ad-slot').count(),2);
  assert.ok(await page.evaluate(()=>{
   const ads=document.querySelectorAll('.ad-slot'), tool=document.getElementById('date-tools');
   return ads[0].getBoundingClientRect().bottom<=tool.getBoundingClientRect().top && tool.getBoundingClientRect().bottom<=ads[1].getBoundingClientRect().top;
  }));
  const operationRequests=[];
  page.on('request',request=>operationRequests.push({method:request.method(),url:request.url()}));
  const select=async id=>{await page.locator(`[data-panel="${id}"]`).click();assert.equal(await page.locator(`#date-tools section:not([hidden])`).count(),1);};
  const submit=async id=>{await page.locator(`[data-form="${id}"] button.primary`).click();};
  const result=async id=>page.locator(`#${id}-result`).innerText();
  const shot=async name=>{if([375,1280].includes(width))await page.screenshot({path:`${output}/${name}-${width}.png`,fullPage:true});};
  for(const [date,label] of [['1873-01-01','明治6年1月1日'],['1912-07-29','明治45年7月29日'],['1912-07-30','大正元年7月30日'],['1926-12-24','大正15年12月24日'],['1926-12-25','昭和元年12月25日'],['1989-01-07','昭和64年1月7日'],['1989-01-08','平成元年1月8日'],['2019-04-30','平成31年4月30日'],['2019-05-01','令和元年5月1日']]){
   await page.locator('#western-date').fill(date);await submit('western');assert.ok((await result('western')).includes(label),date);
  }
  await page.locator('#western-mode').selectOption('year');await page.locator('#western-year').fill('2019');await submit('western');
  assert.match(await result('western'),/平成31年/);assert.match(await result('western'),/令和元年/);await shot('western');
  await select('japanese');await page.locator('#era-year').fill('元');await page.locator('#era-month').fill('1');await page.locator('#era-day').fill('1');await submit('japanese');assert.match(await result('japanese'),/期間外/);
  await page.locator('#era-month').fill('5');await submit('japanese');assert.match(await result('japanese'),/2019年5月1日/);await shot('japanese');
  await page.locator('#era-name').selectOption('平成');await page.locator('#era-year').fill('32');await page.locator('#era-mode').selectOption('year');await submit('japanese');assert.match(await result('japanese'),/存在しない年/);
  await select('table');await page.locator('#table-start').fill('1989');await page.locator('#table-end').fill('1989');await submit('table');assert.equal(await page.locator('#era-table-body tr').count(),1);assert.match(await page.locator('#era-table-body').innerText(),/昭和64年.*平成元年/);await shot('table');
  await page.locator('#table-start').fill('1900');await page.locator('#table-end').fill('1950');await submit('table');assert.match(await result('table'),/50年/);assert.equal(await page.locator('#era-table-wrap').isVisible(),false);
  await select('dates');await submit('dates');assert.match(await result('dates'),/^7日/);await page.locator('#include-start').check();await submit('dates');assert.match(await result('dates'),/^8日/);
  await page.locator('#date-start').fill('2024-02-28');await page.locator('#date-end').fill('2024-03-01');await page.locator('#include-start').uncheck();await submit('dates');assert.match(await result('dates'),/^2日/);await shot('dates');
  await page.locator('#date-operation').selectOption('add');await page.locator('#day-count').fill('1');await submit('dates');assert.match(await result('dates'),/2024年2月29日/);
  await page.locator('#date-start').fill('2100-12-31');await submit('dates');assert.match(await result('dates'),/1873年1月1日/);
  await select('age');await page.locator('#age-reference').fill('2025-02-28');await submit('age');assert.match(await result('age'),/^満24歳/);
  await page.locator('#age details').evaluate(el=>el.open=true);await page.locator('#leap-policy').selectOption('february');await submit('age');assert.match(await result('age'),/^満25歳/);await shot('age');
  await page.locator('[data-copy="age"]').click();await page.waitForFunction(()=>document.getElementById('age-copy-status').textContent.includes('コピーしました'));assert.match(await page.locator('#age-copy-status').innerText(),/コピーしました/);assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/満25歳/);
  await page.evaluate(()=>navigator.clipboard.writeText=()=>Promise.reject(new Error('denied')));await page.locator('[data-copy="age"]').click();await page.waitForFunction(()=>!document.getElementById('age-copy-fallback').hidden);assert.equal(await page.locator('#age-copy-fallback').isVisible(),true);
  await page.locator('#age-reference').fill('2025-03-01');assert.equal(await page.locator('[data-copy="age"]').isVisible(),false);
  await select('western');assert.equal(await page.locator('#western-year').inputValue(),'2019');await page.locator('[data-clear="western"]').click();assert.equal(await page.locator('#western-year').inputValue(),'');assert.equal(await page.locator('#western-mode').inputValue(),'year');
  for(const panel of ['western','japanese','table','dates','age']){
   await select(panel);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}:${panel} overflow`);
  }
  await select('western');
  await page.locator('#western-year').fill('2100');await submit('western');
  assert.match(await result('western'),/現在の令和が続く/);
  await page.locator('#western-year').focus();await page.keyboard.press('Enter');
  assert.match(await result('western'),/令和82年/);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  assert.equal(await page.locator('#birth-date').inputValue(),'');
  assert.equal(await page.locator('#western-year').inputValue(),'');
  assert.equal(await page.locator('[data-copy="western"]').isVisible(),false);
  assert.deepEqual(errors,[]);
  if(remote) assert.ok(external.every(url=>new URL(url).hostname==='pagead2.googlesyndication.com'),'only the configured ad loader may be requested');
  else assert.deepEqual(external,[]);
  assert.deepEqual(operationRequests,[],'date operations must not send requests');
  assert.ok(!await page.locator('[data-text-analytics]').count());
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.ad-slot').first().evaluate(el=>getComputedStyle(el).display),'none');
  await page.emulateMedia({media:'screen'});
  assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});
  report.push({width,eraBoundaries:9,yearOnly:true,invalidEra:true,tableLimit:true,leapDay:true,inclusiveDays:true,dateRange:true,ageLeapPolicy:true,copyAndFallback:true,inputRetained:true,staleResultCleared:true,adPositions:true,operationRequests:operationRequests.length,keyboardSubmit:true,leaveClearsInput:true,horizontalOverflow:false,javascriptErrors:errors,externalRequests:external});
  await context.close();
 }
 const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:900}});
 const noJsPage=await noJs.newPage();await noJsPage.goto(origin+'/date-tools');
 assert.ok(await noJsPage.locator('noscript').isVisible());
 assert.ok(await noJsPage.locator('[data-form="western"] button.primary').isDisabled());
 await noJs.close();
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({localApplication:!remote,remoteApplication:remote,externalScriptsBlockedForFunctionalTest:true,results:report},null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
