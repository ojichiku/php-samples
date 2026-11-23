import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createCsvZip, outputNames } from '../../resources/js/excel-to-csv-export.js';
import { unpackWorkbook } from '../../resources/js/excel-to-csv-archive.js';
import { storeZip } from '../../resources/js/tabular-data-zip.js';

test('シート名の危険な文字、予約名、大文字小文字による重複を調整する', () => {
    assert.deepEqual(outputNames('CON.xlsx', [{ name: '単一' }]), {
        zip: '_CON.zip',
        csv: ['_CON.csv'],
    });
    assert.deepEqual(outputNames('.xlsx', [{ name: 'A?' }, { name: 'a*' }, { name: '...' }]), {
        zip: '_.zip',
        csv: ['__A_.csv', '__a__2.csv', '___.csv'],
    });
});

test('CSVの文字コードと引用符の設定に従って保存する', async () => {
    const sheet = { name: '売上', rows: [[{ value: '00123', address: 'A1' }, { value: '髙,"印"', address: 'B1' }]] };
    const names = outputNames('売上.xlsx', [sheet]);
    const expected = '00123,"髙,""印"""\r\n';
    for (const [encoding, quotes, csv] of [
        ['utf8', 'auto', expected],
        ['bom', 'all', '"00123","髙,""印"""\r\n'],
        ['sjis', 'auto', expected],
    ]) {
        const zip = createCsvZip([sheet], names, { encoding, quotes });
        const entries = await unpackWorkbook(await zip.arrayBuffer());
        const bytes = entries['売上.csv'];
        assert.equal(new TextDecoder(encoding === 'sjis' ? 'shift_jis' : 'utf-8').decode(bytes), csv);
        assert.equal(bytes[0] === 0xef, encoding === 'bom');
    }
    assert.throws(() => createCsvZip([sheet], names, { encoding: 'utf8', quotes: 'none' }), /売上シートのB1.*引用符/);
    // 絵文字は変換不能。波ダッシュは変換できても、復号すると別の文字になる。
    for (const value of ['😀', '〜']) {
        const unsupported = { name: '売上', rows: [[{ value, address: 'A1' }]] };
        assert.throws(() => createCsvZip([unsupported], names, { encoding: 'sjis', quotes: 'auto' }), /売上シートのA1.*Shift_JIS/);
    }
    const noQuote = { name: '売上', rows: [[{ value: '00123', address: 'A1' }]] };
    const output = createCsvZip([noQuote], names, { encoding: 'utf8', quotes: 'none' });
    assert.equal(new TextDecoder().decode((await unpackWorkbook(await output.arrayBuffer()))['売上.csv']), '00123\r\n');
});

test('展開処理で圧縮済みExcel、無圧縮ZIPと破損データを判定する', async () => {
    const workbook = await readFile(new URL('../fixtures/excel-to-csv/売上.xlsx', import.meta.url));
    const entries = await unpackWorkbook(Uint8Array.from(workbook).buffer);
    assert.match(new TextDecoder().decode(entries['xl/workbook.xml']), /東京/);

    const stored = storeZip({ '数字.txt': new TextEncoder().encode('123') }, 'application/zip');
    const bytes = new Uint8Array(await stored.arrayBuffer());
    assert.deepEqual((await unpackWorkbook(bytes.buffer))['数字.txt'], new TextEncoder().encode('123'));
    bytes[30 + new TextEncoder().encode('数字.txt').length] ^= 1;
    await assert.rejects(unpackWorkbook(bytes.buffer), /内部構造/);
    await assert.rejects(unpackWorkbook(new ArrayBuffer(0)), /内部構造/);
});

test('CSV出力の容量上限を超える値をZIP化する前に拒否する', () => {
    const cell = { value: 'a'.repeat(Math.ceil(32 * 1024 * 1024 / 3)), address: 'A1' };
    const sheet = { name: '売上', rows: [[cell]] };
    assert.throws(() => createCsvZip([sheet], { csv: ['売上.csv'] }, { encoding: 'utf8', quotes: 'auto' }), /出力データが大きすぎます/);
});

test('破損や未対応のヘッダーを含む表計算ファイルは展開しない', async () => {
    const zip = await storeZip({ 'data.txt': '1' }, 'application/zip').arrayBuffer();
    const central = new DataView(zip).getUint32(zip.byteLength - 6, true);
    for (const [offset, length, value, expected] of [
        [zip.byteLength - 12, 2, 0, /内部構造/],
        [central, 4, 0, /内部構造/],
        [central + 42, 4, central, /内部構造/],
        [central + 8, 2, 1, /暗号化/],
        [central + 20, 4, zip.byteLength, /内部構造/],
        [central + 24, 4, 32 * 1024 * 1024 + 1, /上限/],
        [central + 10, 2, 7, /内部構造/],
    ]) {
        const copy = zip.slice(0);
        const view = new DataView(copy);
        if (length === 2) view.setUint16(offset, value, true);
        else view.setUint32(offset, value, true);
        await assert.rejects(unpackWorkbook(copy), expected);
    }

    // ZIPのコメントにより、末尾から署名を探し直す場合も読み込める。
    const commented = new Uint8Array(zip.byteLength + 1);
    commented.set(new Uint8Array(zip));
    new DataView(commented.buffer).setUint16(zip.byteLength - 2, 1, true);
    assert.deepEqual((await unpackWorkbook(commented.buffer))['data.txt'], Uint8Array.of(49));
});

test('展開された実容量と記録した容量の不一致を拒否する', async () => {
    const workbook = await readFile(new URL('../fixtures/excel-to-csv/売上.xlsx', import.meta.url));
    for (const [size, expected] of [[1, /上限/], [1024 * 1024, /内部構造/]]) {
        const copy = Uint8Array.from(workbook);
        const view = new DataView(copy.buffer);
        const central = view.getUint32(copy.length - 6, true);
        assert.equal(view.getUint16(central + 10, true), 8);
        const actual = view.getUint32(central + 24, true);
        assert.ok(actual > 1 && actual < 1024 * 1024);
        view.setUint32(central + 24, size, true);
        await assert.rejects(unpackWorkbook(copy.buffer), expected);
    }
});

test('中央ディレクトリの宣言サイズとエントリー分の実サイズを照合する', async () => {
    const zip = new Uint8Array(await storeZip({ 'data.txt': '1' }, 'application/zip').arrayBuffer());
    const end = zip.length - 22;
    const malformed = new Uint8Array(zip.length + 1);
    malformed.set(zip.subarray(0, end));
    malformed.set(zip.subarray(end), end + 1);
    const view = new DataView(malformed.buffer);
    view.setUint32(end + 13, view.getUint32(end + 13, true) + 1, true);
    await assert.rejects(unpackWorkbook(malformed.buffer), /内部構造/);
});

test('圧縮ストリームの読み取りが失敗した表計算ファイルを拒否する', async () => {
    const copy = Uint8Array.from(await readFile(new URL('../fixtures/excel-to-csv/売上.xlsx', import.meta.url)));
    const view = new DataView(copy.buffer);
    const central = view.getUint32(copy.length - 6, true);
    const local = view.getUint32(central + 42, true);
    const content = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    copy[content] = 0x07; // Deflateで未定義のブロック種別。
    await assert.rejects(unpackWorkbook(copy.buffer), { code: 'Z_DATA_ERROR' });
});
