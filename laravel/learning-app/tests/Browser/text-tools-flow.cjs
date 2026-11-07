const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
(async () => {
    const base = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const output = path.resolve(process.env.TEST_ARTIFACT_DIR || 'test-results/browser/text-tools');
    fs.mkdirSync(output, {recursive:true});
    const browser = await chromium.launch({headless:true});
    const results = [];
    try {
        for (const width of [320,375,768,1280]) {
            const page = await browser.newPage({viewport:{width,height:900}});
            const errors=[],requests=[];
            page.on('pageerror',e=>errors.push(e.message));
            page.on('request',r=>requests.push(r.url()+(r.postData()||'')));
            // Block external integrations in repeat functional tests; verify live integration separately.
            await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
            assert.equal((await page.goto(base+'/text-tools')).status(),200);
            await page.locator('[data-tool=count] [data-clear]:enabled').waitFor();
            assert.equal(await page.locator('[data-tool]').count(),7);
            const open=async name=>{await page.locator(`.text-tool-nav a[href="#text-${name}"]`).click();return page.locator(`#text-${name}[open]`);};
            const run=async tool=>{await tool.locator('[data-run]').click();await page.waitForFunction(id=>{const t=document.getElementById(id);return t.querySelector('[data-cancel]').hidden&&t.querySelector('[data-status]').textContent!=='';},await tool.getAttribute('id'));};
            const input=(tool,name)=>tool.locator(`[data-field=${name}]`);
            const out=tool=>tool.locator('[data-output]').inputValue();
            const count=await open('count');await input(count,'text').fill('👨‍👩‍👧‍👦e\u0301 A\n');
            assert.match(await count.locator('[data-stats]').innerText(),/文字数 4.*空白除外 3.*行数 2/);
            const format=await open('format');await input(format,'text').fill(' りんご \nみかん');await run(format);
            assert.equal(await out(format),'りんご\nみかん');assert.equal(await input(count,'text').inputValue(),'👨‍👩‍👧‍👦e\u0301 A\n');
            const replace=await open('replace');await input(replace,'text').fill('2026-11-07');await input(replace,'mode').selectOption('regex');
            await input(replace,'pattern').fill('(\\d{4})-(\\d{2})-(\\d{2})');await input(replace,'replacement').fill('$1/$2/$3');await run(replace);
            assert.equal(await out(replace),'2026/11/07');await input(replace,'replacement').fill('');assert.equal(await out(replace),'');assert.ok(await replace.locator('[data-copy]').isDisabled());await run(replace);assert.match(await replace.locator('[data-status]').innerText(),/結果は空/);
            const lines=await open('lines');await input(lines,'text').fill('10\n2\n1');await input(lines,'operation').selectOption('asc');await run(lines);assert.equal(await out(lines),'1\n10\n2');
            const convert=await open('convert');await input(convert,'text').fill('abc DEF');await input(convert,'mode').selectOption('regex');await input(convert,'pattern').fill('[a-z]+');await run(convert);assert.equal(await out(convert),'ABC DEF');
            const match=await open('match');await input(match,'text').fill('<img src=x onerror=alert(1)>12、追加3');await input(match,'pattern').fill('[0-9]+');await run(match);
            assert.equal(await match.locator('[data-highlight] img').count(),0);assert.equal(await match.locator('[data-highlight] mark').count(),3);assert.equal(await match.locator('[data-matches] tr').count(),3);
            const generate=await open('generate');await input(generate,'pattern').fill('[A-Z]{2}[0-9]{3}');await run(generate);const samples=(await out(generate)).split('\n');assert.equal(samples.length,3);assert.ok(samples.every(s=>/^[A-Z]{2}[0-9]{3}$/.test(s)));
            await input(generate,'pattern').fill('(?=a)a');await run(generate);assert.match(await generate.locator('[data-status]').innerText(),/未対応/);
            await input(generate,'pattern').fill('[');await run(generate);assert.match(await generate.locator('[data-status]').innerText(),/構文/);
            const sentinel='PRIVATE_TEXT_SENTINEL_74x';requests.length=0;await input(match,'text').fill(sentinel);await input(match,'pattern').fill('[A-Z]+');await run(match);
            assert.ok(requests.every(r=>!decodeURIComponent(r).includes(sentinel)));
            await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error())},configurable:true}));await match.locator('[data-copy]').click();assert.match(await match.locator('[data-status]').innerText(),/手動/);
            if(width===1280){await input(match,'text').fill('a'.repeat(40000)+'!');await input(match,'pattern').fill('(a+)+$');await run(match);assert.match(await match.locator('[data-status]').innerText(),/中止/);}
            await input(match,'text').fill('注文12、追加3');await input(match,'pattern').fill('[0-9]+');await run(match);assert.equal(await match.locator('[data-highlight] mark').count(),2);
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
            await match.screenshot({path:path.join(output,`regex-${width}.png`)});await page.screenshot({path:path.join(output,`page-${width}.png`)});
            results.push({width,independentTools:7,regexReplace:true,matchEscaping:true,generationVerified:true,copyFailure:true,noInputInRequests:true,noOverflow:true,errors});await page.close();
        }
        fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
    }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
