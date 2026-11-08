const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
    const base = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const output = path.resolve(process.env.TEST_ARTIFACT_DIR || 'test-results/browser/text-tools');
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const results = [];
    try {
        for (const width of [320, 375, 768, 1280]) {
            const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true });
            const errors = [], requests = [];
            page.on('pageerror', e => errors.push(e.message));
            page.on('request', r => requests.push(r.url() + (r.postData() || '')));
            await page.route('**/*', r => new URL(r.request().url()).origin === new URL(base).origin ? r.continue() : r.abort());
            assert.equal((await page.goto(base + '/text-tools')).status(), 200);
            await page.evaluate(() => {
                const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
                window.testBlobUrls = new Set();
                URL.createObjectURL = blob => { const url = create(blob); window.testBlobUrls.add(url); return url; };
                URL.revokeObjectURL = url => { window.testBlobUrls.delete(url); revoke(url); };
            });
            const tab = name => page.locator(`[data-tab="${name}"]`).click();
            const mode = name => page.locator(`[data-regex="${name}"]`).click();
            const input = page.locator('#input'), out = page.locator('#output'), status = page.locator('#status');
            const run = async () => {
                await page.locator('#run').click();
                await page.waitForFunction(() => document.querySelector('#cancel').hidden && document.querySelector('#status').textContent !== '');
            };
            assert.equal(await page.locator('[data-tab]').count(), 4);
            assert.equal(await page.locator('#example,#transfer,#batch-toggle').count(), 0);
            assert.equal(await page.locator('nav[aria-label="共通メニュー"] a[aria-current="page"]').innerText(), 'テキストツール');
            await input.fill(' A \n\n\n B ');
            await page.locator('[name=blank][value=collapse]').check();
            await run(); assert.equal(await out.inputValue(), 'A\n\nB');
            assert.equal(await input.inputValue(), ' A \n\n\n B ');
            await input.fill('あ😀\n');
            assert.match(await page.locator('#count').innerText(), /3文字.*8バイト/);
            await run();
            requests.length = 0;
            const downloadPromise = page.waitForEvent('download');
            await page.locator('#download').click();
            const download = await downloadPromise;
            assert.equal(download.suggestedFilename(), 'text-result.txt');
            assert.equal(fs.readFileSync(await download.path(), 'utf8'), 'あ😀\n');
            assert.equal(fs.statSync(await download.path()).size, 8);
            assert.ok(requests.every(r => !r.includes('あ') && !r.includes('%E3%81%82')));
            await tab('replace');
            assert.equal(await page.locator('[data-detail=caseEnabled]').isVisible(), false);
            await input.fill(' Ｂ２ a1 ');
            await page.locator('[name=widthEnabled]').check();
            await page.locator('[name=caseEnabled]').check();
            await page.locator('[name=letterCase][value=lower]').check();
            await page.locator('[data-search]').fill('b'); await page.locator('[data-replacement]').fill('c');
            await page.locator('#add-rule').click();
            await page.locator('[data-search]').nth(1).fill('c'); await page.locator('[data-replacement]').nth(1).fill('d');
            await run(); assert.equal(await out.inputValue(), ' d2 a1 ');
            await tab('format'); assert.equal(await input.inputValue(), 'あ😀\n'); assert.equal(await out.inputValue(), 'あ😀\n');
            await tab('lines'); await input.fill('りんご\nみかん\nりんご'); await page.locator('[name=sort][value=asc]').check(); await run();
            assert.equal(await out.inputValue(), 'みかん\nりんご');
            // Clipboard denial must leave the input intact and explain menu-based paste.
            await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { readText: async () => { throw new Error(); }, writeText: async () => { throw new Error(); } }, configurable: true }));
            await page.locator('#paste').click(); assert.match(await status.innerText(), /右クリック.*長押し/);
            assert.equal(await input.inputValue(), 'りんご\nみかん\nりんご');
            await page.locator('#copy').click(); assert.match(await status.innerText(), /手動/);
            await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { readText: async () => '貼り付け\r\n成功' }, configurable: true }));
            page.once('dialog', d => d.dismiss()); await page.locator('#paste').click();
            assert.equal(await input.inputValue(), 'りんご\nみかん\nりんご');
            page.once('dialog', d => d.accept()); await page.locator('#paste').click();
            assert.equal(await input.inputValue(), '貼り付け\n成功');
            assert.ok(await page.locator('#download').isDisabled());
            await tab('regex'); await input.fill('ABC-123'); await page.locator('[name=buildMode][value=general]').check();
            await page.locator('.verification summary').click();
            await page.locator('[name=positive]').fill('XYZ-456'); await page.locator('[name=negative]').fill('abc-123');
            await run(); assert.match(await page.locator('#result-details').innerText(), /OK/);
            const pattern = await out.inputValue(); await page.locator('#use-regex').click();
            assert.equal(await page.locator('[name=pattern]').inputValue(), pattern);
            await input.fill('<img src=x onerror=alert(1)>12、追加3'); await page.locator('[name=pattern]').fill('[0-9]+'); await run();
            assert.equal(await page.locator('#highlight img').count(), 0); assert.equal(await page.locator('#highlight mark').count(), 3);
            await input.fill('a'); await page.locator('[name=pattern]').fill('(?<letter>a)(b)?()'); await run();
            assert.match(await page.locator('#matches').textContent(), /グループ2：未一致/);
            assert.match(await page.locator('#matches').textContent(), /グループ3：空文字/);
            assert.match(await page.locator('#matches').textContent(), /letter：a/);
            await mode('generate'); await input.fill('[A-Z]{2}[0-9]{3}'); await run();
            assert.ok((await out.inputValue()).split('\n').every(v => /^[A-Z]{2}[0-9]{3}$/.test(v)));
            await input.fill('(?=a)a'); await run(); assert.match(await status.innerText(), /未対応/);
            await input.fill('['); await run(); assert.match(await status.innerText(), /構文/);
            await mode('match');
            const sentinel = 'PRIVATE_TEXT_SENTINEL_74x'; requests.length = 0;
            await input.fill(sentinel); await page.locator('[name=pattern]').fill('[A-Z]+'); await run();
            assert.ok(requests.every(r => !decodeURIComponent(r).includes(sentinel)));
            if (width === 1280) {
                await page.locator('summary').filter({hasText:'検索の詳しい設定'}).click();
                await input.fill('😀a'); await page.locator('[name=pattern]').fill('.'); await page.locator('[name=flagU]').uncheck(); await run();
                assert.deepEqual(await page.locator('#matches tr td:nth-child(3)').allTextContents(), ['1行1列', '1行1列', '1行2列']);
                await page.locator('[name=flagU]').check(); await input.fill('a'.repeat(40000) + '!'); await page.locator('[name=pattern]').fill('(a+)+$'); await run(); assert.match(await status.innerText(), /中止/);
                await tab('replace'); await input.fill('a'.repeat(100000));
                await page.locator('[name=widthEnabled]').uncheck(); await page.locator('[name=caseEnabled]').uncheck();
                await page.locator('[data-remove]').nth(1).click();
                await page.locator('[data-search]').fill('a'); await page.locator('[data-replacement]').fill('b'.repeat(10)); await run();
                assert.equal((await out.inputValue()).length, 1000000);
                const largeDownload = page.waitForEvent('download'); await page.locator('#download').click();
                assert.equal(fs.statSync(await (await largeDownload).path()).size, 1000000);
                await page.locator('[data-replacement]').fill('b'.repeat(11)); await run(); assert.match(await status.innerText(), /100万文字/);
                assert.equal((await input.inputValue()).length, 100000); assert.ok(await page.locator('#download').isDisabled());
                await input.fill('a'.repeat(100001)); await run(); assert.match(await status.innerText(), /10万文字/);
                await input.fill('a'); await page.locator('[data-replacement]').fill(''); await run();
                assert.equal(await out.inputValue(), ''); assert.ok(await page.locator('#download').isEnabled());
                const emptyDownload = page.waitForEvent('download'); await page.locator('#download').click();
                assert.equal(fs.statSync(await (await emptyDownload).path()).size, 0);
            }
            for (const name of ['format', 'replace', 'lines', 'regex']) {
                await tab(name);
                assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
                await page.locator('#text-tools').screenshot({ path: path.join(output, `${name}-${width}.png`) });
            }
            await tab('lines'); page.once('dialog', d => d.accept()); await page.locator('#clear').click();
            assert.equal(await input.inputValue(), ''); assert.ok(await page.locator('[name=unique]').isChecked());
            assert.ok(await page.evaluate(() => window.testBlobUrls.size > 0));
            await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
            assert.equal(await page.evaluate(() => window.testBlobUrls.size), 0);
            assert.ok(await page.locator('#text-tools textarea, #text-tools input[type=text]').evaluateAll(fields => fields.every(field => field.value === '')));

            await tab('format'); assert.equal(await input.inputValue(), ''); assert.equal(await out.inputValue(), '');
            assert.deepEqual(errors, []);
            results.push({ width, fourPurposes: true, retained: true, removedThreeControls: true, utf8Download: true, pasteFallback: true, regexGroups: true, noInputInRequests: true, noOverflow: true, errors });
            await page.close();
        }
        fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(results, null, 2));
        console.log(JSON.stringify(results));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
