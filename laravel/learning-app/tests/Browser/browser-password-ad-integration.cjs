/** @file 明示許可されたリモートの広告読込みを確認するCLI。TEST_BASE_URLとALLOW_REMOTE_TESTS=1が必須。生成値は作らず、広告スクリプトのHTTP状態と配置を検査する。TEST_RESULT_FILE指定時だけJSONも保存する。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');
(async () => {
    if (process.env.ALLOW_REMOTE_TESTS !== '1' || !process.env.TEST_BASE_URL) throw new Error('Explicit remote integration authorization required');
    const browser = await chromium.launch({headless: true});
    try {
        const page = await browser.newPage({viewport: {width: 1280, height: 900}});
        const scripts = [], errors = [];
        page.on('response', response => { if (response.url().includes('/pagead/js/adsbygoogle.js')) scripts.push(response.status()); });
        page.on('pageerror', error => errors.push(error.message));
        const response = await page.goto(process.env.TEST_BASE_URL + '/password-generator-browser', {waitUntil: 'domcontentloaded'});
        await page.locator('#browser-generate:enabled').waitFor();
        await page.waitForTimeout(4500);
        // この検証では第三者スクリプトを動かすため、生成操作は行わず空の結果を維持する。
        assert.equal(await page.locator('#browser-all-results').inputValue(), '');
        assert.equal(await page.locator('.ad-slot').count(), 2);
        assert.equal(await page.locator('[data-text-analytics]').count(), 0);
        assert.ok(!response.headers()['content-security-policy'].includes("connect-src 'none'"));
        assert.ok(response.headers()['cache-control'].includes('no-store'));
        assert.equal(response.headers()['referrer-policy'], 'no-referrer');
        assert.ok(await page.evaluate(() => {
            const ads = document.querySelectorAll('.ad-slot');
            const tool = document.querySelector('#browser-password-tool').getBoundingClientRect();
            return ads[0].getBoundingClientRect().bottom <= tool.top && ads[1].getBoundingClientRect().top >= tool.bottom;
        }));
        assert.deepEqual(errors, []);
        const result = {http: response.status(), adSlots: 2, loaderStatuses: scripts, analyticsAdded: false, generatedValuesDuringLiveIntegration: 0, noStore: true, noReferrer: true, formActionNone: response.headers()['content-security-policy'].includes("form-action 'none'"), layoutOutsideTool: true, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), adStatus: await page.locator('ins[data-ad-slot]').evaluateAll(nodes => nodes.map(n => ({initialization: n.dataset.adsbygoogleStatus || null, delivery: n.dataset.adStatus || null}))), errors, scope: 'Live ads loaded with empty generator; generation/copy tested separately with third-party requests blocked. No ad clicks.'};
        assert.ok(result.loaderStatuses.includes(200));
        assert.equal(result.overflow, false);
        if (process.env.TEST_RESULT_FILE) fs.writeFileSync(process.env.TEST_RESULT_FILE, JSON.stringify(result, null, 2) + '\n');
        console.log(JSON.stringify(result));
    } finally {await browser.close();}
})().catch(error => {console.error(error); process.exit(1);});
