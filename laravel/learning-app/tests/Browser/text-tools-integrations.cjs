const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const base=process.env.TEST_BASE_URL;
 if(!base||process.env.ALLOW_REMOTE_TESTS!=='1')throw new Error('Explicit integration URL and ALLOW_REMOTE_TESTS=1 required');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const requests=[],errors=[],responses=[];
  page.on('request',r=>requests.push({url:r.url(),body:r.postData()||''}));
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(/googletagmanager.com\/gtag\/js|googlesyndication.com\/pagead\/js/.test(r.url()))responses.push({service:new URL(r.url()).hostname,status:r.status()});});
  assert.equal((await page.goto(base+'/text-tools')).status(),200);
  await page.locator('[data-tool=count] [data-clear]:enabled').waitFor();
  await page.locator('.text-tool-nav a[href="#text-match"]').click();
  const sentinel='PRIVATE_INPUT_PROBE_86a';
  await page.locator('#match-input').fill(sentinel);
  await page.locator('#match-pattern').fill('PRIVATE_INPUT_PROBE_86a');
  await page.locator('#text-match [data-run]').click();
  await page.waitForFunction(()=>document.querySelector('#text-match [data-status]').textContent.includes('1件一致'));
  await page.waitForTimeout(4500);
  const decode=value=>{for(let i=0;i<3;i++){try{value=decodeURIComponent(value)}catch{break;}}return value;};
  assert.ok(requests.every(r=>!decode(r.url+r.body).includes(sentinel)));
  const queue=await page.evaluate(()=>Array.from(window.dataLayer||[],item=>Array.from(item)));
  assert.ok(queue.some(item=>item[0]==='event'&&item[1]==='text_tool_run'&&item[2].tool_name==='match'&&item[2].outcome==='success'));
  assert.ok(!JSON.stringify(queue).includes(sentinel));
  const report={http:200,advertisingSlots:await page.locator('.ad-slot').count(),analyticsMarker:await page.locator('[data-text-analytics]').count(),integrationResponses:responses,externalDomains:[...new Set(requests.filter(r=>new URL(r.url).origin!==new URL(base).origin).map(r=>new URL(r.url).hostname))],googleAnalyticsRequests:requests.filter(r=>/google-analytics.com\//.test(r.url)).length,inputProbeNotFoundInRequests:true,inputProbeNotFoundInAnalyticsQueue:true,fixedToolEventQueued:true,horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),javascriptErrors:errors,adDelivery:await page.locator('ins[data-ad-slot]').evaluateAll(nodes=>nodes.map(n=>({status:n.dataset.adsbygoogleStatus||null,delivery:n.dataset.adStatus||null}))),limitations:'No ad clicks; observed network and queue only; future third-party behavior, GA dashboard delivery and actual ad display are not guaranteed.'};
  assert.equal(report.advertisingSlots,2);assert.equal(report.analyticsMarker,1);assert.equal(report.horizontalOverflow,false);assert.deepEqual(errors,[]);
  const out=path.resolve(process.env.TEST_ARTIFACT_DIR||'test-results/browser/text-tools-integrations');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
