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
