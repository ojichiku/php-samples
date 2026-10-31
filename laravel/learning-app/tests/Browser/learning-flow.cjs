const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
(async () => {
    const browser = await chromium.launch({headless: true});
    const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
    const output = process.env.TEST_ARTIFACT_DIR || path.resolve(__dirname, '../../test-results/browser/learning');
    fs.mkdirSync(output, {recursive: true});
    const rows = [];
    try {
        for (const width of [375, 1280]) {
            const page = await browser.newPage({viewport: {width, height: 800}});
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            const hello = await page.goto(`${origin}/hello`);
            assert.equal(hello.status(), 200);
            assert.equal(await page.locator('body').innerText(), 'Hello World!');
            await page.goto(`${origin}/hello/view`);
            assert.equal(await page.locator('h1').innerText(), 'Hello World!');
            if (width === 1280) await page.screenshot({path: `${output}/hello-view.png`});
            await page.goto(`${origin}/learning/greeting`);
            assert.equal(await page.locator('#greeting-result').count(), 0);
            await page.locator('#name').fill('サンプル');
            await Promise.all([page.waitForNavigation(), page.getByRole('button', {name: '挨拶を表示'}).click()]);
            assert.equal(await page.locator('#greeting-result').innerText(), 'こんにちは、サンプルさん！');
            if (width === 1280) await page.screenshot({path: `${output}/greeting-result.png`});
            await page.locator('#name').fill('<b>テスト</b>');
            await Promise.all([page.waitForNavigation(), page.getByRole('button', {name: '挨拶を表示'}).click()]);
            assert.equal(await page.locator('#greeting-result').innerText(), 'こんにちは、<b>テスト</b>さん！');
            assert.equal(await page.locator('#greeting-result b').count(), 0);
            await page.locator('form').evaluate(form => form.noValidate = true);
            await page.locator('#name').fill('');
            await Promise.all([page.waitForNavigation(), page.getByRole('button', {name: '挨拶を表示'}).click()]);
            assert.equal(await page.locator('#name-error').innerText(), '名前を入力してください。');
            await page.locator('form').evaluate(form => { form.noValidate = true; form.querySelector('input[name="name"]').removeAttribute('maxlength'); });
            await page.locator('#name').fill('あ'.repeat(41));
            await Promise.all([page.waitForNavigation(), page.getByRole('button', {name: '挨拶を表示'}).click()]);
            assert.equal(await page.locator('#name-error').innerText(), '名前は40文字以内で入力してください。');
            assert.equal(await page.locator('#name').inputValue(), 'あ'.repeat(41));
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            const csrf = await page.request.post(`${origin}/learning/greeting`, {form: {name: 'テスト'}});
            assert.equal(csrf.status(), 419);
            assert.deepEqual(errors, []);
            rows.push({width, hello: 200, greeting: 'passed', validation: 'passed', escaping: 'passed', csrf: 419, horizontalOverflow: false, javascriptErrors: 0});
            await page.close();
        }
        const target = path.join(output, 'browser-results.json');
        fs.writeFileSync(target, JSON.stringify(rows, null, 2) + '\n');
        console.log(JSON.stringify(rows));
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exit(1); });
