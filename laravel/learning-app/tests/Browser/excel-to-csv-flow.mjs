/** @file Excel・ODSからCSVへのローカルブラウザー回帰テスト。 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { unpackWorkbook } from '../../resources/js/excel-to-csv-archive.js';

const url = new URL(process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8000');
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
const fixtureDirectory = new URL('../fixtures/excel-to-csv/', import.meta.url);
const browser = await chromium.launch();

try {
    for (const width of [320, 390, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.route('**/*', route => new URL(route.request().url()).origin === url.origin ? route.continue() : route.abort());
        assert.equal((await page.goto(new URL('/', url).href)).status(), 200);
        assert.equal(await page.locator('.tool-card.available').count(), 10);
        await page.getByRole('navigation').getByRole('link', { name: '表をCSVに変換' }).click();
        await page.waitForURL('**/excel-to-csv');
        const file = page.locator('#excel-input');
        const fileLabel = page.locator('#excel-input-label');
        const fileName = page.locator('#excel-input-name');
        const nextStep = page.locator('#excel-input-next');
        const preview = page.locator('#excel-preview-button');
        const save = page.locator('#excel-download');
        const setFile = name => file.setInputFiles(fileURLToPath(new URL(name, fixtureDirectory)));

        assert.equal(await fileLabel.innerText(), 'ファイルを選ぶ');
        assert.equal(await fileName.innerText(), 'ファイルが選択されていません');
        assert(await nextStep.isHidden());
        await page.getByRole('link', { name: '← ツール一覧' }).focus();
        await page.keyboard.press('Tab');
        assert(await file.evaluate(input => document.activeElement === input));
        assert.equal(await file.evaluate(input => getComputedStyle(input.closest('label')).outlineStyle), 'solid');
        const firstPicker = page.waitForEvent('filechooser');
        await page.keyboard.press('Enter');
        await (await firstPicker).setFiles(fileURLToPath(new URL('売上.xlsx', fixtureDirectory)));
        await nextStep.waitFor();
        assert.equal(await fileLabel.innerText(), 'ファイルを選び直す');
        assert.equal(await fileName.innerText(), '選択中：売上.xlsx');
        await preview.click();
        assert.match(await page.locator('#excel-range').innerText(), /B3:C6/);
        assert(await nextStep.isHidden());
        assert.match(await page.locator('#excel-rows').innerText(), /00123/);
        assert.match(await page.locator('#excel-excluded-list').innerText(), /非公開.*非表示.*\n.*空/s);
        assert.equal(await page.locator('#excel-preview-sheet option').count(), 2);
        await page.locator('#excel-quotes').selectOption('none');
        assert(await nextStep.isVisible());
        await preview.click();
        await page.locator('#excel-export-error.csv-error').waitFor();
        assert.match(await page.locator('#excel-export-error').innerText(), /東京.*C4/);
        assert(await save.isDisabled());

        await page.locator('#excel-quotes').selectOption('auto');
        await page.locator('#excel-encoding').selectOption('sjis');
        await preview.click();
        const first = page.waitForEvent('download');
        await save.click();
        const zip = await first;
        assert.equal(zip.suggestedFilename(), '売上.zip');
        const bytes = await readFile(await zip.path());
        const files = await unpackWorkbook(Uint8Array.from(bytes).buffer);
        assert.deepEqual(Object.keys(files), ['売上_東京.csv', '売上_大阪.csv']);
        for (const city of ['東京', '大阪']) {
            const expected = await readFile(new URL(`期待結果_${city}.csv`, fixtureDirectory), 'utf8');
            assert.equal(new TextDecoder('shift_jis').decode(files[`売上_${city}.csv`]), expected);
        }
        // cancelはブラウザーが選び直しを取り消したときに出すイベント。
        await file.dispatchEvent('cancel');
        assert.equal(await fileName.innerText(), '選択中：売上.xlsx');
        assert(await save.isEnabled());

        // プレビューの上限にかかわらず、保存済みの数式結果を含む全行を出力する。
        await setFile('売上明細_120件.xlsx');
        await nextStep.waitFor();
        await page.locator('#excel-encoding').selectOption('utf8');
        await preview.click();
        assert.match(await page.locator('#excel-range').innerText(), /B3:I123.*全121行.*先頭100行/);
        assert.equal(await page.locator('#excel-rows tr').count(), 100);
        const detailedDownload = page.waitForEvent('download');
        await save.click();
        const detailedZip = await detailedDownload;
        assert.equal(detailedZip.suggestedFilename(), '売上明細_120件.zip');
        const detailedBytes = await readFile(await detailedZip.path());
        const detailedFiles = await unpackWorkbook(Uint8Array.from(detailedBytes).buffer);
        assert.deepEqual(Object.keys(detailedFiles), ['売上明細_120件_売上明細.csv', '売上明細_120件_集計.csv']);
        for (const [sheet, expectedSuffix] of [['売上明細', '明細'], ['集計', '集計']]) {
            const expected = await readFile(new URL(`期待結果_売上明細120_${expectedSuffix}.csv`, fixtureDirectory));
            assert.deepEqual(Buffer.from(detailedFiles[`売上明細_120件_${sheet}.csv`]), expected);
        }

        await page.locator('#excel-encoding').selectOption('sjis');
        await preview.click();
        await page.locator('#excel-export-error.csv-error').waitFor();
        assert.match(await page.locator('#excel-export-error').innerText(), /売上明細シートのC8.*Shift_JIS/);
        assert(await save.isDisabled());

        await setFile('壊れた.xlsx');
        await page.locator('#excel-input-status.csv-error').waitFor();
        assert.equal(await fileName.innerText(), '選択中：壊れた.xlsx');
        assert(await nextStep.isHidden());
        assert(await preview.isDisabled());
        assert(await save.isDisabled());
        assert(!await page.locator('#excel-preview').isVisible());

        await setFile('単一.ods');
        await page.locator('#excel-encoding').selectOption('bom');
        await preview.click();
        const second = page.waitForEvent('download');
        await save.click();
        const single = await second;
        assert.equal(single.suggestedFilename(), '単一.zip');
        const singleBytes = await readFile(await single.path());
        const singleFiles = await unpackWorkbook(Uint8Array.from(singleBytes).buffer);
        assert.deepEqual(Object.keys(singleFiles), ['単一.csv']);
        const expectedSingle = await readFile(new URL('期待結果_単一.csv', fixtureDirectory));
        assert.deepEqual(Buffer.from(singleFiles['単一.csv']), expectedSingle);
        const longName = '表'.repeat(120) + '.ods';
        await file.setInputFiles({
            name: longName,
            mimeType: 'application/vnd.oasis.opendocument.spreadsheet',
            buffer: await readFile(new URL('単一.ods', fixtureDirectory)),
        });
        await nextStep.waitFor();
        assert.equal(await fileName.innerText(), `選択中：${longName}`);
        assert(await save.isDisabled());
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await setFile('数式.xlsx');
        await page.locator('#excel-input-status.csv-error').waitFor();
        assert.match(await page.locator('#excel-input-status').innerText(), /未計算.*A2.*保存済み/);
        assert(await save.isDisabled());
        await file.setInputFiles([]);
        assert.equal(await fileLabel.innerText(), 'ファイルを選ぶ');
        assert.equal(await fileName.innerText(), 'ファイルが選択されていません');
        assert(await nextStep.isHidden());
        await page.getByRole('link', { name: 'ツール一覧に戻る' }).click();
        await page.locator('.tool-card').filter({ hasText: 'Excel・ODSからCSVへ' }).getByRole('link').click();
        await page.waitForURL('**/excel-to-csv');
        assert.deepEqual(pageErrors, []);
        await page.close();
        console.log(`${width}px: XLSX・ODS・ZIPを確認`);
    }
} finally {
    await browser.close();
}
