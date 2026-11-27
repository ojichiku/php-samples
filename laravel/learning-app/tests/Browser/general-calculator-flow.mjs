/** @file 一覧から電卓を開き、入力・計算・メモリ・履歴を利用者の手順で確認する。 */
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const base = new URL((process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/?$/, '/'));
const local = ['127.0.0.1', 'localhost'].includes(base.hostname);
assert(local || (base.protocol === 'https:' && process.env.ALLOW_REMOTE_TESTS === '1'));
const artifacts = process.env.TEST_ARTIFACT_DIR;
if (artifacts) await mkdir(artifacts, {recursive: true});
const browser = await chromium.launch();

try {
    for (const width of [320, 390, 1280]) {
        const page = await browser.newPage({viewport: {width, height: 900}, hasTouch: width !== 1280});
        const errors = [];
        const requests = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.route('**/*', (route) => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
        const get = (id) => page.locator(`#${id}`);
        const press = (element) => width === 1280 ? element.click() : element.tap();
        const key = (value) => page.locator(`[data-value="${value}"]`);
        const field = get('expression');
        const result = get('result');
        const calculate = async (expression, expected) => {
            await field.fill(expression);
            if (width === 1280) await field.press('Enter');
            else await press(get('calculate'));
            assert.equal(await result.textContent(), expected, expression);
        };

        assert.equal((await page.goto(base.href)).status(), 200);
        assert.equal(await page.locator('.tool-card.available').count(), 14);
        await page.getByRole('navigation').getByRole('link', {name: '一般電卓', exact: true}).click();
        await page.waitForURL('**/general-calculator');
        assert.equal(await page.locator('nav [aria-current="page"]').textContent(), '一般電卓');
        await page.getByRole('link', {name: '← ツール一覧', exact: true}).click();
        await page.getByRole('link', {name: /一般電卓を開く/}).click();
        await page.waitForURL('**/general-calculator');
        await page.locator('#calculator:not([inert])').waitFor();
        page.on('request', (request) => requests.push(request.url()));

        const geometry = await page.evaluate(() => {
            const area = (query) => document.querySelector(query).getBoundingClientRect();
            const main = area('main');
            const inputs = area('.display');
            const controls = area('.controls');
            const functions = area('#functions');
            const ads = [...document.querySelectorAll('.ad-slot')].map((element) => element.getBoundingClientRect());
            return {
                centered: Math.abs(main.left + main.right - innerWidth) < 1,
                hasOverflow: document.documentElement.scrollWidth > innerWidth,
                order: inputs.bottom <= controls.top && controls.bottom <= functions.top,
                ads: ads.length,
                surrounding: ads.length === 2 && ads[0].bottom <= inputs.top && ads[1].top >= functions.bottom,
            };
        });
        assert(geometry.centered && geometry.order && !geometry.hasOverflow);
        assert(geometry.ads === 0 || geometry.surrounding);
        assert(await get('calculate').isDisabled());
        assert(await get('memory-recall').isDisabled());
        for (const value of ['2', '+', '3']) await press(key(value));
        await press(get('calculate'));
        assert.equal(await result.textContent(), '5');
        await press(get('clear'));
        await press(get('restore'));
        await press(get('cursor-left'));
        await press(key('1'));
        assert.equal(await field.inputValue(), '2+13');
        await press(get('calculate'));
        assert.equal(await result.textContent(), '15');

        await calculate('0.1+0.2-0.3', '0');
        await press(get('memory-save'));
        assert.match(await get('memory-value').textContent(), /0/);
        await calculate('200*(1+10%)', '220');
        await calculate('1/3', '0.333333333333');
        assert(await get('approximation').isVisible());
        await calculate('sin(30)', '0.5');
        const toggle = page.locator('#functions > summary');
        await press(toggle);
        await press(page.locator('#functions label').filter({hasText: 'ラジアン RAD'}));
        await press(toggle);
        assert.equal(await get('angle-indicator').textContent(), 'ラジアン RAD');
        assert(await get('copy').isDisabled());
        await calculate('sin(pi/6)', '0.5');
        await calculate('tan(pi/2)', '—');
        assert.match(await get('feedback').textContent(), /定義されません/);
        await press(page.locator('.history summary'));
        const count = await get('history-count').textContent();
        await press(get('history').getByRole('button').filter({hasText: 'sin(30)'}));
        assert.equal(await get('angle-indicator').textContent(), '度 DEG');
        assert.equal(await field.inputValue(), 'sin(30)');
        assert.equal(await get('history-count').textContent(), count);

        await calculate('-2', '-2');
        await press(get('memory-save'));
        await press(get('clear'));
        await press(get('memory-recall'));
        await press(key('^'));
        await press(key('2'));
        await press(get('calculate'));
        assert.equal(await field.inputValue(), '(-2)^2');
        assert.equal(await result.textContent(), '4');
        await press(get('history-clear'));
        assert(await get('restore').isDisabled());
        assert.match(await get('memory-value').textContent(), /-2/);
        await press(get('memory-clear'));
        assert(await get('memory-recall').isDisabled());
        await press(get('copy'));
        await page.waitForFunction(() => /コピー/.test(document.querySelector('#feedback').textContent));
        for (let value = 1; value <= 21; value++) await calculate(String(value), String(value));
        assert.equal(await get('history-count').textContent(), '20件');
        assert.equal(await get('history').locator('li').last().locator('span').textContent(), '2');
        await field.fill('1'.repeat(257));
        assert.equal(await field.inputValue(), '21');
        assert.match(await get('feedback').textContent(), /256文字/);
        await calculate('1/0', '—');
        assert(await get('copy').isDisabled());
        assert.equal(await get('history-count').textContent(), '20件');
        assert.deepEqual(requests, []);

        await page.reload();
        assert.equal(await field.inputValue(), '');
        assert.equal(await get('history-count').textContent(), '0件');
        assert.equal(await get('angle-indicator').textContent(), '度 DEG');
        if (artifacts) {
            await calculate('1200*1.1', '1320');
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({path: path.join(artifacts, `general-calculator-${width}.png`), fullPage: true});
        }
        assert.deepEqual(errors, []);
        console.log(`General calculator passed at ${width}px`);
        await page.close();
    }
} finally {
    await browser.close();
}
