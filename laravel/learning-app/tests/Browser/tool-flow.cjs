const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
const output = process.env.TEST_ARTIFACT_DIR || path.resolve(__dirname, '../../test-results/browser/tools');

async function noOverflow(page) {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'unexpected horizontal scrolling');
}

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const results = [];
    try {
        for (const width of [320, 375, 768, 1280]) {
            const context = await browser.newContext({ viewport: { width, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
            const page = await context.newPage();
            const errors = [];
            const external = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('request', request => {
                if (new URL(request.url()).origin !== new URL(base).origin) external.push(new URL(request.url()).origin);
            });
            assert.equal((await page.goto(base)).status(), 200);
            await noOverflow(page);
            if ([375, 1280].includes(width)) await page.screenshot({ path: path.join(output, `menu-${width}.png`), fullPage: true });
            if (width === 768) {
                await page.getByRole('link', { name: '使い方を見る' }).focus();
                await page.keyboard.press('Enter');
            } else {
                await page.getByRole('link', { name: '使い方を見る' }).click();
            }
            await page.waitForURL('**/password-generator');
            await noOverflow(page);
            await page.getByRole('link', { name: 'パスワードを生成する' }).click();
            await page.waitForURL('**/password-generator/generate');
            await noOverflow(page);
            assert.equal(await page.locator('#generated-password').inputValue(), '');
            assert.ok(await page.getByRole('button', { name: 'コピーする' }).isDisabled());
            if (width === 375) await page.screenshot({ path: path.join(output, 'password-form-375.png'), fullPage: true });
            await page.getByLabel('文字数', { exact: true }).fill('64');
            await page.locator('input[value=symbols]').check();
            const [response] = await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                page.getByRole('button', { name: '生成する', exact: true }).click(),
            ]);
            assert.equal(response.status(), 200);
            assert.ok(response.headers()['cache-control'].includes('no-store'));
            await noOverflow(page);
            const value = await page.locator('#generated-password').inputValue();
            assert.equal(value.length, 64);
            for (const pattern of [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/]) assert.ok(pattern.test(value), 'missing selected character type');
            await page.getByRole('button', { name: 'コピーする' }).click();
            await page.getByText('コピーしました。', { exact: true }).waitFor();
            assert.ok(await page.evaluate(async value => (await navigator.clipboard.readText()) === value, value), 'clipboard content mismatch');
            assert.ok(await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0), 'unexpected browser storage');
            assert.equal(new URL(page.url()).search, '');
            await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('blocked for test'); } } }); });
            await page.getByRole('button', { name: 'コピーする' }).click();
            await page.getByText('自動でコピーできませんでした。選択した生成値を手動でコピーしてください。', { exact: true }).waitFor();
            assert.ok(await page.locator('#generated-password').evaluate(element => element.selectionStart === 0 && element.selectionEnd === element.value.length));
            for (const box of await page.locator('input[type=checkbox]').all()) await box.uncheck();
            await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.getByRole('button', { name: '生成する', exact: true }).click()]);
            await page.getByRole('alert').waitFor();
            assert.ok(await page.getByRole('alert').evaluate(element => document.activeElement === element), 'validation error should receive keyboard focus');
            assert.ok(await page.getByRole('alert').innerText().then(text => text.includes('1つ以上')));
            assert.equal(await page.locator('#generated-password').inputValue(), '');
            assert.equal(await page.locator('input[type=checkbox]:checked').count(), 0);
            await noOverflow(page);
            await page.getByRole('link', { name: 'ツール一覧に戻る' }).click();
            await page.waitForURL(base + '/');
            assert.equal(errors.length, 0, 'JavaScript error detected');
            assert.equal(external.length, 0, 'third-party request detected');
            results.push({ width, navigation: 'PASS', no_horizontal_scroll: 'PASS', generation_64: 'PASS', clipboard: 'PASS', clipboard_fallback: 'PASS', validation: 'PASS', external_requests: 0, javascript_errors: 0 });
            await context.close();
        }
        const context = await browser.newContext();
        const response = await context.request.post(base + '/password-generator/generate', { form: { length: '16', 'groups[0]': 'numbers' } });
        assert.equal(response.status(), 419, 'POST without CSRF token should be rejected');
        assert.ok(response.headers()['cache-control'].includes('no-store'));
        await context.close();
        fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify({ screens: results, csrf_missing: 419, keyboard_navigation: 'PASS' }, null, 2));
        console.log(JSON.stringify({ screens: results, csrf_missing: 419, keyboard_navigation: 'PASS' }, null, 2));
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error.message); process.exit(1); });
