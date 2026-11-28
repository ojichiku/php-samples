/** @file JSONツールの入口とレスポンシブ操作、CSVの実際の保存を確認する。 */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const fixtures = new URL('../fixtures/json-tools/', import.meta.url);

const origin = new URL(process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8000');
assert.ok(['127.0.0.1', 'localhost'].includes(origin.hostname));
const artifacts = process.env.TEST_ARTIFACT_DIR;
if (artifacts) await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch();

try {
    for (const width of [320, 390, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const errors = [];
        const outgoing = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', (route) => {
            const request = route.request();
            if (new URL(request.url()).origin === origin.origin && request.method() === 'GET') return route.continue();
            outgoing.push(request.url());
            return route.abort();
        });
        const locate = (name) => page.locator('#json-' + name);
        assert.equal((await page.goto(new URL('/', origin).href)).status(), 200);
        assert.equal(await page.locator('.tool-card.available').count(), 17);
        await page.getByRole('navigation').getByRole('link', { name: 'JSONチェック' }).click();
        await page.waitForURL('**/json-tools');
        assert.equal(await page.getByRole('navigation').locator('[aria-current="page"]').innerText(), 'JSONチェック');
        await page.getByRole('link', { name: '← ツール一覧' }).click();
        await page.locator('.tool-card').getByRole('link', { name: 'JSONをチェックする' }).click();
        await page.waitForURL('**/json-tools');
        assert(await locate('run').isDisabled());

        await locate('text').fill('{"a":1,}');
        await locate('run').click();
        await locate('status').getByText(/1行目8列目/).waitFor();
        assert(await locate('download').isDisabled());

        assert(!(await locate('indent-panel').isVisible()));
        const nestedJson = '{"item":{"code":"00123","id":9007199254740993}}';
        await locate('text').fill(nestedJson);
        await locate('operation').selectOption('format');
        assert.equal(await locate('indent').inputValue(), '2');
        for (const [style, whitespace] of [['2', '  '], ['4', '    '], ['tab', '\t']]) {
            await locate('indent').selectOption(style);
            assert.equal(await locate('text').inputValue(), nestedJson);
            assert(await locate('download').isDisabled());
            assert(!(await locate('output').isVisible()));
            await locate('run').click();
            await locate('output').waitFor();
            const expected = ['{', whitespace + '"item": {', whitespace.repeat(2) + '"code": "00123",',
                whitespace.repeat(2) + '"id": 9007199254740993', whitespace + '}', '}'].join('\n');
            assert.equal(await locate('output').inputValue(), expected);
            if (style === 'tab') {
                const download = page.waitForEvent('download');
                await locate('download').click();
                const file = await download;
                assert.equal(await readFile(await file.path(), 'utf8'), expected);
            }
        }
        if (artifacts && width !== 320) {
            await page.screenshot({ fullPage: true, path: `${artifacts}/json-tools-indent-${width}.png` });
        }
        await locate('operation').selectOption('minify');
        assert(!(await locate('indent-panel').isVisible()));
        await locate('run').click();
        await locate('output').waitFor();
        assert.equal(await locate('output').inputValue(), nestedJson);

        await locate('operation').selectOption('csv');
        await locate('file').setInputFiles(fileURLToPath(new URL('items.json', fixtures)));
        await locate('file-status').getByText('items.json').waitFor();
        await locate('run').click();
        await locate('preview').waitFor();
        assert.deepEqual(await locate('preview-body').locator('td').allTextContents(), ['00123', 'ノート, A5']);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        const panels = await page.locator('.json-tools .panel').all();
        const inputBox = await panels[0].boundingBox();
        const resultBox = await panels[1].boundingBox();
        assert.equal(resultBox.y > inputBox.y, width <= 900);
        const download = page.waitForEvent('download');
        await locate('download').click();
        const file = await download;
        assert.equal(file.suggestedFilename(), 'items.csv');
        assert.deepEqual(await readFile(await file.path()), await readFile(new URL('expected.csv', fixtures)));
        if (artifacts && width !== 320) {
            await page.screenshot({ fullPage: true, path: `${artifacts}/json-tools-${width}.png` });
        }
        await locate('file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from([255]) });
        await locate('file-status').getByText(/UTF-8のファイルとして/).waitFor();
        assert(await locate('download').isEnabled());

        await locate('text').fill('{"id":123}');
        assert(await locate('download').isDisabled());
        await locate('operation').selectOption('generate');
        await locate('run').click();
        await locate('output').waitFor();
        assert.equal(JSON.parse(await locate('output').inputValue()).properties.id.type, 'integer');

        await locate('operation').selectOption('validate');
        assert(await locate('schema-panel').isVisible());
        assert(await locate('run').isDisabled());
        await locate('text').fill('[{"stock":"3"}]');
        await locate('schema').fill('{"items":{"properties":{"stock":{"type":"integer"}}}}');
        await locate('run').click();
        await locate('status').getByText(/適合していません.*\/0\/stock/s).waitFor();
        assert(await locate('download').isDisabled());
        await locate('text').fill('[{"stock":3}]');
        await locate('run').click();
        await locate('status').getByText('スキーマに適合しています。').waitFor();
        await locate('schema').fill('{"$ref":"https://example.com/outside"}');
        await locate('run').click();
        await locate('status').getByText(/\$ref.*同一文書内/).waitFor();

        await locate('format').selectOption('schema');
        assert(!(await locate('indent-panel').isVisible()));
        await locate('text').fill('{"required":"stock"}');
        await locate('run').click();
        await locate('status').getByText(/\/required.*array/).waitFor();
        await locate('text').fill('{"type":"object"}');
        await locate('run').click();
        await locate('status').getByText(/Draft 2020-12/).waitFor();
        await locate('operation').selectOption('format');
        await locate('run').click();
        await locate('output').waitFor();
        assert.equal(await locate('output').inputValue(), '{\n\t"type": "object"\n}');

        await locate('format').selectOption('jsonl');
        assert(!(await locate('indent-panel').isVisible()));
        assert(await locate('schema-panel').isHidden());
        assert.equal(await locate('text').inputValue(), '{"type":"object"}');
        await locate('text').fill(' { "id" : 1 }\n null');
        await locate('run').click();
        await locate('output').waitFor();
        assert.equal(await locate('output').inputValue(), '{"id":1}\nnull\n');
        await locate('clear').click();
        assert.equal(await locate('text').inputValue(), '');
        assert(await locate('download').isDisabled());
        assert.deepEqual(errors, []);
        assert.deepEqual(outgoing, []);
        await page.close();
        console.log(`JSONツールの画面と保存を確認（${width}px）`);
    }
} finally {
    await browser.close();
}
