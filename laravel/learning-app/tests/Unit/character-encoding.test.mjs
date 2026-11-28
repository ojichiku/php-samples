import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
    convertedFilename, createOutput, inputByteLimit, inspectCp932Issues, inspectText, readSourceFile, replaceCp932Issues,
} from '../../resources/js/character-encoding-engine.js';

const sampleDirectory = new URL('../fixtures/character-encoding/', import.meta.url);
const sampleFile = async name => new File([await readFile(new URL(name, sampleDirectory))], name);
const outputBytes = async (text, encoding, newline) => Buffer.from(await createOutput(text, encoding, newline).arrayBuffer());

test('UTF-8はBOMを一つだけ外し、本文のFEFFを保つ', async () => {
    const file = await sampleFile('bom-utf8.txt');
    assert.deepEqual(await readSourceFile(file, 'utf8'), { text: '東京', hasBom: true });
    assert.deepEqual(await readSourceFile(new File(['\uFEFF\uFEFF東京\uFEFF'], 'double-bom.txt'), 'utf8'), {
        text: '\uFEFF東京\uFEFF', hasBom: true,
    });
    await assert.rejects(readSourceFile(file, 'cp932'), /BOM.*UTF-8/);
});

test('手動でCP932を選択する。選んだ文字コードで読めないバイトは置換しない', async () => {
    const file = await sampleFile('tokyo-cp932.txt');
    await assert.rejects(readSourceFile(file, 'utf8'), /UTF-8として読み込めません/);
    assert.deepEqual(await readSourceFile(file, 'cp932'), { text: '東京\r\n', hasBom: false });
    const invalid = new File([Uint8Array.of(0x82)], 'invalid.txt');
    await assert.rejects(readSourceFile(invalid, 'cp932'), /CP932.*読み込めません/);
    await assert.rejects(readSourceFile(invalid, 'utf8'), /UTF-8として読み込めません/);
    const extension = new File([Uint8Array.of(0x87, 0x40)], 'extension.txt');
    assert.deepEqual(await readSourceFile(extension, 'cp932'), { text: '①', hasBom: false });
    assert.deepEqual(await outputBytes('①', 'cp932', 'lf'), Buffer.from([0x87, 0x40]));
});

test('5 MiBちょうどと空ファイルは読み、超過したファイルは読み込み前に断る', async () => {
    const empty = new File([], 'empty.txt');
    assert.deepEqual(await readSourceFile(empty, 'utf8'), { text: '', hasBom: false });
    assert.deepEqual(await outputBytes('', 'utf8-bom', 'lf'), Buffer.from([0xEF, 0xBB, 0xBF]));

    const content = 'x'.repeat(inputByteLimit);
    const input = new File([content], 'max.txt');
    const { text } = await readSourceFile(input, 'utf8');
    assert.equal(text.length, inputByteLimit);
    assert.equal((await outputBytes(text, 'utf8', 'lf')).length, inputByteLimit);

    await assert.rejects(readSourceFile({
        size: inputByteLimit + 1,
        arrayBuffer: () => assert.fail('容量超過時は読み込まない'),
    }, 'utf8'), /5 MiB/);
});

test('OSなどがファイルを読み取れない場合に選び直しを案内する', async () => {
    await assert.rejects(readSourceFile({
        size: 1,
        async arrayBuffer() { throw new Error('読み込み不可'); },
    }, 'utf8'), /選び直してください/);
});

test('混在改行の種類と末尾改行はファイル全体で判定し、出力も全体を変換する', async () => {
    const { text } = await readSourceFile(await sampleFile('mixed-utf8.txt'), 'utf8');
    assert.deepEqual(inspectText(text), {
        preview: text, truncated: false, counts: { crlf: 1, lf: 1, cr: 0 }, endsWithNewline: true,
    });
    assert.deepEqual(await outputBytes(text, 'utf8', 'lf'), Buffer.from('東京\n大阪\n'));
    const lastLineWithoutNewline = '東京\r\r\n大阪';
    assert.deepEqual(inspectText(lastLineWithoutNewline), {
        preview: lastLineWithoutNewline, truncated: false, counts: { crlf: 1, lf: 0, cr: 1 }, endsWithNewline: false,
    });
    assert.deepEqual(await outputBytes(lastLineWithoutNewline, 'utf8-bom', 'crlf'), Buffer.from('\uFEFF東京\r\n\r\n大阪'));
});

test('プレビューは最大10行と最大1000コードポイントを守る', () => {
    const manyLines = '東京\n'.repeat(11);
    assert.deepEqual(inspectText(manyLines), {
        preview: '東京\n'.repeat(9) + '東京', truncated: true, counts: { crlf: 0, lf: 11, cr: 0 }, endsWithNewline: true,
    });
    const exactlyLimit = '🍵'.repeat(1000);
    assert.deepEqual(inspectText(exactlyLimit + 'X'), {
        preview: exactlyLimit, truncated: true, counts: { crlf: 0, lf: 0, cr: 0 }, endsWithNewline: false,
    });
    assert.equal(inspectText(exactlyLimit).truncated, false);
    assert.deepEqual(inspectText(''), {
        preview: '', truncated: false, counts: { crlf: 0, lf: 0, cr: 0 }, endsWithNewline: false,
    });
});

test('CP932に正しく保存できる文字だけを受け入れ、文字が変わる場合は止める', async () => {
    assert.deepEqual(await outputBytes('東京\n', 'cp932', 'crlf'), Buffer.from([0x93, 0x8C, 0x8B, 0x9E, 0x0D, 0x0A]));
    const { text } = await readSourceFile(await sampleFile('emoji-utf8.txt'), 'utf8');
    for (const unsupported of [text, '〜']) {
        assert.throws(() => createOutput(unsupported, 'cp932', 'lf'), /元の文字を保てません/);
        assert.deepEqual(await outputBytes(unsupported, 'utf8', 'lf'), Buffer.from(unsupported));
    }
});

test('CP932で保持できない文字は混在改行と補助文字を考慮して位置を集計する', () => {
    const report = inspectCp932Issues('東京—\r\n🍵—\r—\n①');
    assert.deepEqual(report, {
        total: 4, omitted: 0, canReplace: false,
        issues: [
            { character: '—', replacement: '―', count: 3, positions: [
                { line: 1, column: 3 }, { line: 2, column: 2 }, { line: 3, column: 1 },
            ] },
            { character: '🍵', replacement: null, count: 1, positions: [{ line: 2, column: 1 }] },
        ],
    });
    assert.deepEqual(inspectCp932Issues('東京\\~\n'), { total: 0, omitted: 0, canReplace: false, issues: [] });
});

test('表示を省略しても件数と置換可否は本文全体で判定する', () => {
    const unsupported = Array.from({ length: 13 }, (_, index) => String.fromCodePoint(0x1F340 + index));
    const report = inspectCp932Issues('—'.repeat(13) + unsupported.join(''));
    assert.equal(report.total, 26);
    assert.equal(report.omitted, 2);
    assert.equal(report.canReplace, false);
    assert.equal(report.issues.length, 12);
    assert.equal(report.issues[0].count, 13);
    assert.equal(report.issues[0].positions.length, 12);
});

test('候補がそろうときは表示した文字だけを置換しCP932で往復できる', async () => {
    const source = '東京—大阪〜京都−神戸\n';
    const report = inspectCp932Issues(source);
    assert.equal(report.canReplace, true);
    assert.equal(report.total, 3);
    const output = replaceCp932Issues(source, report.issues);
    assert.equal(source, '東京—大阪〜京都−神戸\n');
    assert.equal(output, '東京―大阪～京都－神戸\n');
    const bytes = await outputBytes(output, 'cp932', 'crlf');
    assert.equal(new TextDecoder('shift_jis', { fatal: true }).decode(bytes), '東京―大阪～京都－神戸\r\n');
});

test('保存名には最終拡張子を維持し、拡張子がなければtxtを使う', () => {
    assert.equal(convertedFilename('議事録.log'), '議事録-converted.log');
    assert.equal(convertedFilename('data.old.log'), 'data.old-converted.log');
    assert.equal(convertedFilename('議事録'), '議事録-converted.txt');
    assert.equal(convertedFilename('.notes'), '.notes-converted.txt');
    assert.equal(convertedFilename('trailing.'), 'trailing.-converted.txt');
});
