/** @file 一覧と共通メニューからURL変換を開き、入出力・画面幅・通信の有無を確認する。 */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = new URL(process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8000');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname));
const cases = JSON.parse(await readFile(new URL('../fixtures/url-encoding/cases.json', import.meta.url), 'utf8'));
const artifacts = process.env.TEST_ARTIFACT_DIR;
if (artifacts) await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch();

try {
    for (const width of [320, 390, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
        const errors = [];
        const external = [];
        const conversionRequests = [];
        let converting = false;
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => {
            if (converting) conversionRequests.push(request.url());
        });
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin === base.origin) return route.continue();
            external.push(url.href);
            return route.abort();
        });

        assert.equal((await page.goto(new URL('/', base).href)).status(), 200);
        assert.equal(await page.locator('.tool-card.available').count(), 17);
        await page.getByRole('navigation').getByRole('link', { name: 'URL変換', exact: true }).click();
        await page.waitForURL('**/url-encoding');
        assert.equal(await page.locator('nav [aria-current=page]').innerText(), 'URL変換');
        await page.getByRole('link', { name: '← ツール一覧' }).click();
        await page.getByRole('link', { name: 'URLを変換する' }).click();
        await page.waitForURL('**/url-encoding');
        await page.waitForLoadState('networkidle');
        assert.equal(await page.locator('main .ad-preview').count(), 2);

        const get = name => page.locator('#url-' + name);
        assert.equal(await get('format').inputValue(), 'component');
        for (const button of ['encode', 'decode', 'copy']) assert(await get(button).isDisabled());
        const positions = await Promise.all(['format', 'input', 'encode', 'result', 'copy'].map(name => get(name).boundingBox()));
        assert(positions.every((rect, index) => index === 0 || positions[index - 1].y < rect.y));
        const encode = positions[2];
        const decode = await get('decode').boundingBox();
        assert.equal(decode.y, encode.y);
        assert.ok(decode.x >= encode.x + encode.width);

        converting = true;
        for (const sample of cases) {
            await get('format').selectOption(sample.format);
            await get('input').fill(sample.input);
            assert(await get('copy').isDisabled());
            await get(sample.encode ? 'encode' : 'decode').click();
            assert.equal(await get('input').inputValue(), sample.input);
            if (sample.error) {
                assert.match(await get('error').innerText(), new RegExp(sample.error));
                assert.equal(await get('result').textContent(), '');
                assert(await get('copy').isDisabled());
            } else {
                assert.equal(await get('result').textContent(), sample.output);
                assert(await get('error').isHidden());
                assert(await get('copy').isEnabled());
            }
        }
        // 復号時に得たHTML風の文字も、結果にテキストとして表示する。
        await get('input').fill('%3Cem%3E%E7%8C%AB%3C%2Fem%3E');
        await get('decode').click();
        assert.equal(await get('result').textContent(), '<em>猫</em>');
        assert.equal(await get('result').locator('em').count(), 0);
        await get('copy').click();
        await get('status').getByText('コピーしました。').waitFor();
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '<em>猫</em>');
        await get('format').selectOption('form');
        assert.equal(await get('result').textContent(), '');
        assert(await get('copy').isDisabled());

        await get('input').fill('x'.repeat(65537));
        await get('encode').click();
        assert.match(await get('error').innerText(), /64 KiB/);
        assert(await get('copy').isDisabled());
        await get('format').selectOption('component');
        await get('input').fill('東京 +');
        await get('encode').click();
        if (artifacts && width !== 320) {
            await page.screenshot({ path: `${artifacts}/url-encoding-${width}.png`, fullPage: true });
        }
        // コピーの応答が遅れても、書き換えた入力に以前の成功・失敗を報告しない。
        for (const denied of [false, true]) {
            await page.evaluate(rejectCopy => {
                Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
                    writeText: () => new Promise((resolve, reject) => {
                        window.finishCopy = () => rejectCopy ? reject(new Error('コピー拒否を再現')) : resolve();
                    }),
                } });
            }, denied);
            await get('copy').click();
            await get('input').fill('別の入力');
            await page.evaluate(() => window.finishCopy());
            assert.equal(await get('status').textContent(), '');
            assert(await get('copy').isDisabled());
            await get('input').fill('東京 +');
            await get('encode').click();
        }
        await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: {
            writeText: () => Promise.reject(new Error('コピー拒否を再現')),
        } }));
        await get('copy').click();
        await get('status').getByText(/手動でコピー/).waitFor();
        assert.equal(await page.evaluate(() => window.getSelection()?.toString()), cases[0].output);
        await get('input').fill('');
        assert(await get('encode').isDisabled());
        assert(await get('decode').isDisabled());
        assert(await get('copy').isDisabled());

        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        assert.deepEqual(errors, []);
        assert.deepEqual(external, []);
        assert.deepEqual(conversionRequests, []);
        assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
        converting = false;
        await get('input').fill('東京 +');
        await get('encode').click();
        await page.reload();
        assert.equal(await get('input').inputValue(), '');
        assert.equal(await get('result').textContent(), '');
        await page.getByRole('link', { name: 'ツール一覧に戻る' }).click();
        await page.waitForURL(base.href);
        console.log(`URL変換: ${width}pxで成功`);
        await page.close();
    }
} finally {
    await browser.close();
}
