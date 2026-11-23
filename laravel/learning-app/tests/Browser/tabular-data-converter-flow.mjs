/** @file 表データコンバーターの固定ファイルによるローカルE2E。 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const url = new URL(process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8000');
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
const fixtures = new URL('../fixtures/tabular-data-converter/', import.meta.url);
const browser = await chromium.launch();

try {
    for (const width of [320, 390, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.route('**/*', route => new URL(route.request().url()).origin === url.origin ? route.continue() : route.abort());

        assert.equal((await page.goto(new URL('/', url).href)).status(), 200);
        await page.getByRole('navigation').getByRole('link', { name: '表データ変換' }).click();
        await page.waitForURL('**/tabular-data-converter');

        const file = page.locator('#input-file');
        const check = page.locator('#check');
        const save = page.locator('#output');
        const encoding = page.locator('#encoding');
        const format = page.locator('#format');
        const preview = page.locator('#preview');
        const summary = page.locator('#summary');
        const issues = page.locator('#issues');
        const selectFile = name => file.setInputFiles(fileURLToPath(new URL(name, fixtures)));

        await selectFile('normal-utf8.csv');
        await check.click();
        await preview.waitFor();
        assert.match(await summary.innerText(), /4データ行・4列/);
        assert.match(await issues.innerText(), /先頭ゼロを含むセルが4件/);
        assert.match(await issues.innerText(), /空欄セルが1件/);
        assert(await save.isEnabled());

        for (const [extension, xmlPath, valuePattern] of [
            ['xlsx', 'xl/worksheets/sheet1.xml', /t="inlineStr".*?>=1\+1</],
            ['ods', 'content.xml', /office:value-type="string"><text:p>=1\+1</],
        ]) {
            await format.selectOption(extension);
            const downloadEvent = page.waitForEvent('download');
            await save.click();
            const download = await downloadEvent;
            assert.equal(download.suggestedFilename(), `normal-utf8.${extension}`);
            const bytes = await readFile(await download.path());
            // 出力ZIPは無圧縮なので、構成ファイル名と文字列セルのXMLを読み戻せる。
            assert.equal(bytes.readUInt32LE(0), 0x04034b50);
            const storedXml = bytes.toString('utf8');
            assert.ok(storedXml.includes(xmlPath));
            assert.match(storedXml, valuePattern);
        }

        await selectFile('normal-utf8.tsv');
        assert(await preview.isHidden());
        assert(await save.isDisabled());
        assert.equal(await page.locator('#input-format').inputValue(), 'tsv');
        await check.click();
        await preview.waitFor();
        assert.match(await summary.innerText(), /2データ行・3列/);

        await selectFile('normal-cp932.csv');
        await check.click();
        await issues.waitFor();
        assert.match(await issues.innerText(), /UTF-8として読み込めません/);
        assert(await save.isDisabled());
        await encoding.selectOption('cp932');
        await check.click();
        await preview.waitFor();
        assert.match(await summary.innerText(), /1データ行・2列/);

        await encoding.selectOption('utf8');
        for (const [name, expected] of [
            ['error-column-count.csv', /3行目は3列必要ですが、2列/],
            ['error-unclosed-quote.tsv', /2行目で始まった.*閉じていません/],
        ]) {
            await selectFile(name);
            await check.click();
            await issues.waitFor();
            assert.match(await issues.innerText(), expected);
            assert(await save.isDisabled());
        }

        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.getByRole('link', { name: 'ツール一覧に戻る' }).click();
        await page.locator('.tool-card').filter({ hasText: '表データコンバーター' }).getByRole('link').click();
        await page.waitForURL('**/tabular-data-converter');
        assert.deepEqual(pageErrors, []);
        await page.close();
        console.log(`${width}px: CSV・TSVの取り込みとExcel・ODSの出力を確認`);
    }
} finally {
    await browser.close();
}
