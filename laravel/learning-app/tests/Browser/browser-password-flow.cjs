const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
(async () => {
    const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
    if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname) && process.env.ALLOW_REMOTE_TESTS !== '1') throw new Error('Remote tests require explicit authorization');
    const output = process.env.TEST_ARTIFACT_DIR || path.resolve(__dirname, '../../test-results/browser/browser-password');
    fs.mkdirSync(output, {recursive: true});
    const browser = await chromium.launch({headless: true});
    const results = [];
    try {
        for (const width of [320, 375, 768, 1280]) {
            const context = await browser.newContext({viewport: {width, height: 900}, permissions: ['clipboard-read', 'clipboard-write']});
            const page = await context.newPage();
            const errors = [];
            const requests = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
            const response = await page.goto(`${base}/password-generator-browser`, {waitUntil: 'networkidle'});
            assert.equal(response.status(), 200);
            assert.ok(response.headers()['cache-control'].includes('no-store'));
            assert.equal(await page.getByRole('heading', {name: 'パスワード生成（JavaScript版）', exact: true}).count(), 1);
            assert.ok(await page.evaluate(() => {
                const panels = [...document.querySelectorAll('.generator-grid > section')].map(el => el.getBoundingClientRect());
                return panels[0].bottom <= panels[1].top && Math.abs(panels[0].width - panels[1].width) < 1;
            }), 'settings and results must stay in one column');
            const liveAdSlots = await page.locator('ins.adsbygoogle[data-ad-slot]').count();
            assert.equal(response.headers()['content-security-policy'].includes("connect-src 'none'"), liveAdSlots === 0);
            page.on('request', request => requests.push({url: request.url(), method: request.method()}));
            const generate = page.getByRole('button', {name: 'パスワードを生成', exact: true});
            await page.locator('#browser-count').fill('5');
            await generate.click();
            assert.equal((await page.locator('#browser-all-results').inputValue()).split('\n').length, 5);
            const values = (await page.locator('#browser-all-results').inputValue()).split('\n');
            for (const value of values) {
                assert.equal(value.length, 16);
                assert.match(value, /[a-z]/); assert.match(value, /[A-Z]/); assert.match(value, /[0-9]/);
                assert.match(value, /^[a-zA-Z0-9]+$/);
            }
            await page.getByRole('button', {name: '全件コピー', exact: true}).click();
            assert.equal(await page.evaluate(() => navigator.clipboard.readText()), values.join('\n'));
            await page.locator('input[value="symbols"]').check();
            assert.equal(await page.locator('#browser-all-results').inputValue(), '');
            await page.locator('#browser-symbol-mode').selectOption('custom');
            await page.locator('#browser-custom-symbols').fill('<>&');
            await page.locator('#browser-length').fill('128');
            await page.locator('#browser-count').fill('100');
            await generate.click();
            const custom = (await page.locator('#browser-all-results').inputValue()).split('\n');
            assert.equal(custom.length, 100);
            for (const value of custom) {
                assert.equal(value.length, 128); assert.match(value, /[<>&]/); assert.match(value, /^[a-zA-Z0-9<>&]+$/);
            }
            assert.equal(await page.locator('#browser-all-results').isVisible(), true);
            assert.ok(await page.locator('#browser-all-results').evaluate(area => area.scrollHeight <= area.clientHeight + 2), 'all wrapped lines must be visible');
            await page.getByRole('button', {name: '結果を消す', exact: true}).click();
            assert.equal(await page.locator('#browser-all-results').inputValue(), '');
            await page.locator('#browser-custom-symbols').fill('abc');
            await generate.click();
            assert.match(await page.locator('#browser-password-error').innerText(), /半角ASCII記号/);
            await page.locator('input[value="symbols"]').uncheck();
            await page.locator('#browser-count').fill('101');
            await generate.click();
            assert.match(await page.locator('#browser-password-error').innerText(), /発行数/);
            await page.locator('#browser-count').fill('3');
            await page.locator('#browser-length').fill('16');
            await generate.click();
            await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async () => {throw new Error('blocked');}}}));
            await page.getByRole('button', {name: '全件コピー', exact: true}).click();
            assert.equal(await page.locator('#browser-all-results').isVisible(), true);
            assert.match(await page.locator('#browser-password-status').innerText(), /手動でコピー/);
            assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
            assert.equal(new URL(page.url()).search, '');
            assert.deepEqual(requests, [], 'generation, validation and copying must not send requests');
            assert.deepEqual(errors, []);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.getByRole('button', {name: '結果を消す', exact: true}).click();
            await generate.click();
            assert.equal((await page.locator('#browser-all-results').inputValue()).split('\n').length, 3);
            await page.evaluate(() => {window.dispatchEvent(new PageTransitionEvent('pagehide'));});
            assert.equal(await page.locator('#browser-all-results').inputValue(), '');
            assert.equal(await page.locator('#browser-all-results').inputValue(), '');
            results.push({width, generation: 'passed', batch100: 'passed', customSymbols: 'passed', copies: 'passed', validation: 'passed', storageEntries: 0, requestsDuringUse: 0, externalScriptsBlockedForFunctionalTest: true, javascriptErrors: 0, horizontalOverflow: false});
            await context.close();
        }
        const context = await browser.newContext({javaScriptEnabled: false});
        const page = await context.newPage();
        await page.goto(`${base}/password-generator-browser`);
        assert.ok(await page.getByRole('button', {name: 'パスワードを生成', exact: true}).isDisabled());
        await context.close();
        const blocked = await browser.newContext();
        await blocked.addInitScript(() => Object.defineProperty(globalThis, 'crypto', {value: undefined}));
        const blockedPage = await blocked.newPage();
        await blockedPage.goto(`${base}/password-generator-browser`);
        assert.ok(await blockedPage.locator('#browser-generate').isDisabled());
        assert.match(await blockedPage.locator('#browser-password-error').innerText(), /乱数を利用できない/);
        await blocked.close();
        fs.writeFileSync(`${output}/results.json`, JSON.stringify({screens: results, javascriptDisabled: 'generation disabled', cryptoUnavailable: 'generation disabled'}, null, 2) + '\n');
        console.log(JSON.stringify({screens: results, javascriptDisabled: 'generation disabled', cryptoUnavailable: 'generation disabled'}));
    } finally {await browser.close();}
})().catch(error => {console.error(error); process.exit(1);});
