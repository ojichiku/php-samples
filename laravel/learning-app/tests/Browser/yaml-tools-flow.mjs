/** @file YAMLの画面、往復変換、入力エラー、保存実ファイルを確認する。 */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const origin = new URL(process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8000');
assert.ok(['127.0.0.1', 'localhost'].includes(origin.hostname));
const fixtures = new URL('../fixtures/yaml-tools/', import.meta.url);
const artifacts = process.env.TEST_ARTIFACT_DIR;
if (artifacts) await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch();

try {
    for (const width of [320, 390, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const outgoing = [];
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => {
            const request = route.request();
            if (new URL(request.url()).origin === origin.origin && request.method() === 'GET') return route.continue();
            outgoing.push(request.url());
            return route.abort();
        });
        const field = name => page.locator('#yaml-' + name);
        const selectFile = async name => {
            await field('file').setInputFiles(fileURLToPath(new URL(name, fixtures)));
            await field('file-status').getByText(name, { exact: true }).waitFor();
        };
        const checkFile = async (name, expected) => {
            const download = page.waitForEvent('download');
            await field('download').click();
            const actual = await download;
            assert.equal(actual.suggestedFilename(), name);
            assert.deepEqual(await readFile(await actual.path()), await readFile(new URL(expected, fixtures)));
        };

        assert.equal((await page.goto(new URL('/', origin).href)).status(), 200);
        assert.equal(await page.locator('.tool-card.available').count(), 14);
        await page.getByRole('navigation').getByRole('link', { name: 'YAMLチェック', exact: true }).click();
        await page.waitForURL('**/yaml-tools');
        assert.equal(await page.locator('nav [aria-current="page"]').innerText(), 'YAMLチェック');
        await page.getByRole('link', { name: '← ツール一覧' }).click();
        await page.getByRole('link', { name: 'YAMLをチェックする' }).click();
        await page.waitForURL('**/yaml-tools');
        assert(await field('run').isDisabled());
        assert(await field('indent-panel').isHidden());

        await selectFile('settings.yaml');
        await field('run').click();
        await field('status').getByText('YAMLの構文は正しいです。').waitFor();
        assert(await field('download').isDisabled());
        await field('operation').selectOption('format');
        assert.equal(await field('indent').inputValue(), '2');
        await field('run').click();
        await field('output').waitFor();
        await checkFile('settings-formatted.yaml', 'expected-2.yaml');
        await field('indent').selectOption('4');
        assert(await field('download').isDisabled());
        assert(await field('output').isHidden());
        assert.match(await field('text').inputValue(), /^# 商品の表示設定/);
        await field('run').click();
        await field('output').waitFor();
        await checkFile('settings-formatted.yaml', 'expected-4.yaml');
        if (artifacts && width !== 320) {
            await page.screenshot({ fullPage: true, path: `${artifacts}/yaml-tools-${width}.png` });
        }

        await field('operation').selectOption('to-json');
        assert(await field('indent-panel').isHidden());
        await field('run').click();
        await field('output').waitFor();
        await checkFile('settings.json', 'expected.json');
        await field('format').selectOption('json');
        assert(await field('operation').isDisabled());
        assert.equal(await field('operation').inputValue(), 'to-yaml');
        assert.equal(await field('indent').inputValue(), '4');
        await selectFile('input.json');
        await field('run').click();
        await field('output').waitFor();
        await checkFile('input.yaml', 'expected-from-json.yaml');

        await field('format').selectOption('yaml');
        assert(await field('operation').isEnabled());
        await selectFile('tab-indent.yaml');
        await field('run').click();
        await field('status').getByText(/2行目1列目.*半角スペース/).waitFor();
        assert(await field('download').isDisabled());
        await selectFile('alias.yaml');
        await field('run').click();
        await field('status').getByText(/構文は正しい.*アンカー/s).waitFor();
        await field('operation').selectOption('to-json');
        await field('run').click();
        await field('status').getByText(/アンカー.*整形・変換できません/).waitFor();
        assert(await field('output').isHidden());

        await selectFile('utf8-bom.yml');
        await field('run').click();
        await field('output').waitFor();
        const before = await field('output').inputValue();
        await field('file').setInputFiles(fileURLToPath(new URL('invalid-utf8.yml', fixtures)));
        await field('file-status').getByText(/UTF-8のファイルとして読み込めません/).waitFor();
        assert.equal(await field('output').inputValue(), before);
        assert.equal(JSON.parse(before).name, '表示名');

        // Workerの応答を止め、5秒上限と、続く操作での回復を確認する。
        if (width === 390) {
            await page.clock.install();
            await page.evaluate(() => {
                window.normalWorker = window.Worker;
                window.Worker = class {
                    postMessage() {}
                    terminate() {}
                };
            });
            await field('run').click();
            await page.clock.fastForward(5001);
            await field('status').getByText(/処理時間の上限/).waitFor();
            assert(await field('download').isDisabled());
            await page.evaluate(() => { window.Worker = window.normalWorker; });
            await field('run').click();
            await field('output').waitFor();
        }
        await field('text').fill('other: 1');
        assert(await field('download').isDisabled());
        assert(await field('output').isHidden());
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        const [inputBox, outputBox] = await Promise.all([field('input-title').boundingBox(), field('result-title').boundingBox()]);
        assert.equal(outputBox.y > inputBox.y, width <= 900);
        if (process.env.TEST_AD_PREVIEW === '1') {
            assert.equal(await page.locator('main .ad-slot .ad-preview').count(), 2);
        }
        await field('clear').click();
        assert(await field('run').isDisabled());
        await page.getByRole('link', { name: 'ツール一覧に戻る' }).click();
        await page.waitForURL(new URL('/', origin).href);
        assert.deepEqual(errors, []);
        assert.deepEqual(outgoing, []);
        await page.close();
        console.log(`${width}px: YAMLの入口、入力、処理、保存とレイアウトを確認`);
    }
} finally {
    await browser.close();
}
