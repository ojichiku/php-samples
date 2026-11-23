import assert from 'node:assert/strict';
import test from 'node:test';

import { checkTabularData, inputByteLimit, readTabularFile } from '../../resources/js/tabular-data-parser.js';
import { createSpreadsheet, spreadsheetError } from '../../resources/js/tabular-data-spreadsheet.js';

test('引用符内の区切り文字と改行を保持し、問題の開始行を表示する', () => {
    const input = 'コード,備考\r\n001,"商品,A\r\n""備品"""\r\n002\r\n003,';
    const result = checkTabularData(input, ',', true);
    assert.deepEqual(result.records, [['コード', '備考'], ['001', '商品,A\r\n"備品"'], ['003', '']]);
    assert.deepEqual(result.errors, ['4行目は2列必要ですが、1列です。']);
    assert.equal(result.dataRows, 3);
    assert.equal(result.leadingZeroCells, 2);
    assert.equal(result.emptyCells, 1);
    assert.match(checkTabularData('見出し\n"閉じていない', ',', true).errors[0], /2行目.*閉じていません/);
    assert.deepEqual(checkTabularData('コード\t備考\n01\t"a"', '\t', false).records[1], ['01', '"a"']);
});

test('データ行、列、入力容量の上限を超えたファイルを止める', async () => {
    const input = '見出し\n' + '値\n'.repeat(5000);
    assert.equal(checkTabularData(input, ',', true).dataRows, 5000);
    assert.match(checkTabularData(input + '値', ',', true).errors[0], /5,000データ行/);
    const header = Array(100).fill('列').join(',');
    assert.equal(checkTabularData(header, ',', true).records[0].length, 100);
    assert.match(checkTabularData(header + ',列', ',', true).errors[0], /100列/);
    await assert.rejects(readTabularFile({ size: inputByteLimit + 1 }, 'utf8'), /5 MiB/);
});

test('表計算形式ごとの上限をチェックし、保存可能な形式で生成する', () => {
    const limit = 32767;
    const records = [['日付', 'コード'], ['2026/01/02', '00123']];
    assert.equal(spreadsheetError([['あ'.repeat(limit)]], 'xlsx'), '');
    assert.match(spreadsheetError([['あ'.repeat(limit + 1)]], 'xlsx'), /32,767文字/);
    assert.match(spreadsheetError([['\u0000']], 'ods'), /制御文字/);
    assert.equal(createSpreadsheet(records, 'xlsx').type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.equal(createSpreadsheet(records, 'ods').type, 'application/vnd.oasis.opendocument.spreadsheet');
});

test('ExcelとODSのシート名をdataで出力する', async () => {
    const records = [['商品コード'], ['00123']];
    // 生成したZIPは無圧縮のため、内部XMLのシート名を確認できる。
    const xlsx = await createSpreadsheet(records, 'xlsx').text();
    const ods = await createSpreadsheet(records, 'ods').text();
    assert.match(xlsx, /<sheet name="data" sheetId="1"/);
    assert.match(ods, /<table:table table:name="data">/);
});

test('UTF-8とCP932を判定し、異なる文字コードと読み取り失敗を案内する', async () => {
    const utf8 = new File([new TextEncoder().encode('\uFEFF見出し\n値')], 'utf8.csv');
    const cp932 = new File([Uint8Array.of(0x82, 0xa0)], 'cp932.csv');
    const invalidCp932 = new File([Uint8Array.of(0x82)], 'invalid.csv');
    assert.equal(await readTabularFile(utf8, 'utf8'), '見出し\n値');
    assert.equal(await readTabularFile(cp932, 'cp932'), 'あ');
    await assert.rejects(readTabularFile(cp932, 'utf8'), /UTF-8として読み込めません/);
    await assert.rejects(readTabularFile(invalidCp932, 'cp932'), /Shift_JIS（CP932）として読み込めません/);
    const unreadable = { size: 1, async arrayBuffer() { throw new Error('read failed'); } };
    await assert.rejects(readTabularFile(unreadable, 'utf8'), /ファイルを読み込めませんでした/);
});

test('空ファイル、引用符の誤配置、終端の区切り文字を点検する', () => {
    assert.match(checkTabularData('', ',', true).errors[0], /ファイルが空/);
    for (const malformed of ['a"b', '"a"b']) {
        assert.match(checkTabularData('見出し\r' + malformed, ',', true).errors[0], /2行目.*位置/);
    }
    assert.deepEqual(checkTabularData('a,b\n"x\ny",', ',', true).records, [['a', 'b'], ['x\ny', '']]);
    assert.equal(checkTabularData('見出し\n' + '値\n'.repeat(5001), ',', true).dataRows, 5001);
});

test('ExcelとODSで空白・記号・制御文字の保存条件を検証する', async () => {
    const cell = '  <&>\t\n';
    const columns = Array.from({ length: 27 }, () => cell);
    const xlsx = await createSpreadsheet([columns, ['_x0001_\u0001']], 'xlsx').text();
    assert.match(xlsx, /r="AA1" t="inlineStr"/);
    assert.match(xlsx, /&lt;&amp;&gt;/);
    assert.match(xlsx, /_x005F_x0001__x0001_/);
    const ods = await createSpreadsheet([[cell]], 'ods').text();
    assert.match(ods, /<text:s text:c="2"\/>&lt;&amp;&gt;<text:tab\/><text:line-break\/>/);
    assert.throws(() => createSpreadsheet([['\u0001']], 'ods'), /制御文字/);
});
