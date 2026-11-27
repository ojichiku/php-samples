/** @file URL変換の書式差、エラー、UTF-8バイト境界を確認する。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { convertUrlText } from '../../resources/js/url-encoding-engine.js';

const cases = JSON.parse(readFileSync(new URL('../fixtures/url-encoding/cases.json', import.meta.url), 'utf8'));
for (const sample of cases) {
    test(`${sample.format} ${sample.encode ? 'エンコード' : 'デコード'} ${JSON.stringify(sample.input)}`, () => {
        const { input, format, encode, output, error } = sample;
        if (error) assert.throws(() => convertUrlText(input, format, encode), new RegExp(error));
        else assert.equal(convertUrlText(input, format, encode), output);
    });
}

test('バイト数の上限はASCII相当の文字数と一致する場合・しない場合の両方を判定する', () => {
    const limit = 64 * 1024;
    assert.equal(convertUrlText('x'.repeat(limit), 'component', true).length, limit);
    assert.equal(convertUrlText('😀'.repeat(limit / 4), 'form', true).length, limit * 3);
    assert.throws(() => convertUrlText('x'.repeat(limit + 1), 'component', false), /64 KiB/);
    assert.throws(() => convertUrlText('😀'.repeat(limit / 4) + 'x', 'form', true), /64 KiB/);
});

test('孤立サロゲートや途中で切れた%表記を拒否する', () => {
    assert.throws(() => convertUrlText('\ud800', 'form', true), /UTF-8に変換できない/);
    assert.throws(() => convertUrlText('%A', 'component', false), /16進数/);
    assert.throws(() => convertUrlText('%', 'component', false), /16進数/);
});
