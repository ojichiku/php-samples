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
            await page.locator('[data-tool=edit] [data-clear]:enabled').waitFor();
            assert.equal(await page.locator('[data-tool]').count(),4);
            const open=async name=>{await page.locator(`.text-tool-nav a[href="#text-${name}"]`).click();return page.locator(`#text-${name}[open]`);};
            const run=async tool=>{await tool.locator('[data-run]').click();await page.waitForFunction(id=>{const t=document.getElementById(id);return t.querySelector('[data-cancel]').hidden&&t.querySelector('[data-status]').textContent!=='';},await tool.getAttribute('id'));};
            const input=(tool,name)=>tool.locator(`[data-field=${name}]`);
            const out=tool=>tool.locator('[data-output]').inputValue();
            const edit=await open('edit');await input(edit,'text').fill('👨‍👩‍👧‍👦e\u0301 A\n');
            assert.match(await edit.locator('[data-stats]').innerText(),/文字数 4.*空白除外 3.*行数 2/);
            const original=' Ｂ２ \n a1 \n Ｂ２ \n\n'; await input(edit,'text').fill(original);
            await edit.locator('[data-choice=width][value=half]').check();
            await edit.locator('[data-choice=letterCase][value=lower]').check();
            await edit.locator('[data-choice=trim]').check();
            await edit.locator('[data-choice=blank][value=blank]').check();
            await edit.locator('[data-choice=unique]').check();
            await edit.locator('[data-choice=sort][value=asc]').check();
            await edit.locator('[data-choice=replaceEnabled]').check();
            await edit.locator('[data-rule-search]').fill('b');await edit.locator('[data-rule-replacement]').fill('c');
            await edit.locator('[data-add-rule]').click();
            await edit.locator('[data-rule-search]').nth(1).fill('c');await edit.locator('[data-rule-replacement]').nth(1).fill('d');
            await run(edit);assert.equal(await out(edit),'a1\nd2');assert.equal(await input(edit,'text').inputValue(),original);
            await edit.locator('[data-choice=sort][value=desc]').check();assert.equal(await out(edit),'');await run(edit);assert.equal(await out(edit),'d2\na1');
            const build=await open('build');await input(build,'text').fill('ABC-123');
            await build.locator('[data-choice=buildMode][value=general]').check();
            await input(build,'positive').fill('XYZ-456');await input(build,'negative').fill('abc-123');await run(build);
            assert.match(await build.locator('[data-checks]').innerText(),/OK/);
            assert.ok(new RegExp(await out(build),'u').test('XYZ-456'));
            await build.locator('[data-use-pattern]').click();
            assert.equal(await page.locator('#match-pattern').inputValue(),await out(build));
            const match=await open('match');await input(match,'text').fill('<img src=x onerror=alert(1)>12、追加3');await input(match,'pattern').fill('[0-9]+');await run(match);
            assert.equal(await match.locator('[data-highlight] img').count(),0);assert.equal(await match.locator('[data-highlight] mark').count(),3);assert.equal(await match.locator('[data-matches] tr').count(),3);assert.match(await match.locator('[data-matches]').innerText(),/グループの指定なし/);
            await input(match,'text').fill('a');await input(match,'pattern').fill('(?<letter>a)(b)?()');await run(match);assert.match(await match.locator('[data-matches]').innerText(),/グループ2：未一致/);assert.match(await match.locator('[data-matches]').innerText(),/グループ3：空文字/);assert.match(await match.locator('[data-matches]').innerText(),/letter：a/);
            const generate=await open('generate');await input(generate,'pattern').fill('[A-Z]{2}[0-9]{3}');await run(generate);const samples=(await out(generate)).split('\n');assert.equal(samples.length,3);assert.ok(samples.every(s=>/^[A-Z]{2}[0-9]{3}$/.test(s)));
            await input(generate,'pattern').fill('(?=a)a');await run(generate);assert.match(await generate.locator('[data-status]').innerText(),/未対応/);
            await input(generate,'pattern').fill('[');await run(generate);assert.match(await generate.locator('[data-status]').innerText(),/構文/);
            const sentinel='PRIVATE_TEXT_SENTINEL_74x';requests.length=0;await input(match,'text').fill(sentinel);await input(match,'pattern').fill('[A-Z]+');await run(match);
            assert.ok(requests.every(r=>!decodeURIComponent(r).includes(sentinel)));
            await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error())},configurable:true}));await match.locator('[data-copy]').click();assert.match(await match.locator('[data-status]').innerText(),/手動/);
            if(width===1280){await input(match,'text').fill('😀a');await input(match,'pattern').fill('.');await match.locator('[data-flag=u]').uncheck();await run(match);assert.deepEqual(await match.locator('[data-matches] tr td:nth-child(3)').allTextContents(),['1行1列','1行1列','1行2列']);await match.locator('[data-flag=u]').check();await input(match,'text').fill('a'.repeat(40000)+'!');await input(match,'pattern').fill('(a+)+$');await run(match);assert.match(await match.locator('[data-status]').innerText(),/中止/);}
            await input(match,'text').fill('注文12、追加3');await input(match,'pattern').fill('[0-9]+');await run(match);assert.equal(await match.locator('[data-highlight] mark').count(),2);
            await page.locator('.text-tool-nav a[href="#text-edit"]').click();
            page.once('dialog',d=>d.accept());await edit.locator('[data-clear]').click();assert.equal(await input(edit,'text').inputValue(),'');assert.equal(await out(edit),'');assert.equal(await edit.locator('[data-rule-search]').first().inputValue(),'');assert.ok(await edit.locator('[data-choice=unique]').isChecked());
            await edit.screenshot({path:path.join(output,`edit-${width}.png`)});
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
            await match.screenshot({path:path.join(output,`regex-${width}.png`)});await page.screenshot({path:path.join(output,`page-${width}.png`)});
            results.push({width,sections:4,batchOrder:true,inputRetained:true,multipleRules:true,builderVerified:true,readableGroups:true,clearRetainsSettings:true,matchEscaping:true,generationVerified:true,copyFailure:true,noInputInRequests:true,noOverflow:true,errors});await page.close();
        }
        fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
    }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
