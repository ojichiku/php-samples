/** @file 色コードの正規化、入力上限、書式・範囲エラーを確認する。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { convertColorCode } from '../../resources/js/color-code-engine.js';

test('3桁と6桁のHEXから、同じ色のRGBと大文字6桁HEXを返す', () => {
    assert.deepEqual(convertColorCode('#369'), { hex: '#336699', rgb: 'rgb(51, 102, 153)' });
    assert.deepEqual(convertColorCode(' #abC '), { hex: '#AABBCC', rgb: 'rgb(170, 187, 204)' });
    assert.deepEqual(convertColorCode('#a0B1c2'), { hex: '#A0B1C2', rgb: 'rgb(160, 177, 194)' });
    assert.deepEqual(convertColorCode('#000'), { hex: '#000000', rgb: 'rgb(0, 0, 0)' });
    assert.deepEqual(convertColorCode('#ffffff'), { hex: '#FFFFFF', rgb: 'rgb(255, 255, 255)' });
});

test('RGBの整数は空白・先頭ゼロ・関数名の大小を正規化する', () => {
    assert.deepEqual(convertColorCode(' RGB( 000,\t255 , 008 ) '), { hex: '#00FF08', rgb: 'rgb(0, 255, 8)' });
    assert.deepEqual(convertColorCode('rgb(1,10,16)'), { hex: '#010A10', rgb: 'rgb(1, 10, 16)' });
});

test('未入力または上限内の空白だけの入力は結果なしになる', () => {
    assert.equal(convertColorCode(''), null);
    assert.equal(convertColorCode(' \t\n'), null);
});

test('空白を含め、入力上限をUnicodeコードポイントで判定する', () => {
    assert.deepEqual(convertColorCode(`#369${' '.repeat(60)}`), { hex: '#336699', rgb: 'rgb(51, 102, 153)' });
    assert.throws(() => convertColorCode(`#369${' '.repeat(61)}`), /64文字/);
    assert.throws(() => convertColorCode('😀'.repeat(64)), /形式/);
    assert.throws(() => convertColorCode('😀'.repeat(65)), /64文字/);
});

test('RGBの各成分で255を超えた値を範囲エラーにする', () => {
    for (const input of ['rgb(256, 0, 0)', 'rgb(0, 256, 0)', 'rgb(0, 0, 256)']) {
        assert.throws(() => convertColorCode(input), /RGBの各値は0〜255/);
    }
});

test('非対応の色指定、桁数、符号、小数、区切りは形式エラーにする', () => {
    for (const input of [
        '369', '#1234', '#12xyz9', '#336699FF', 'rgb(1.5, 2, 3)', 'rgb(+1, 2, 3)',
        'rgb(-1, 2, 3)', 'rgb(1%, 2, 3)', 'rgb(0 0 0)', 'rgb(1, 2)', 'rgb(1, 2, 3, 4)',
        'rgb(0000, 0, 0)', 'rgb(１, 0, 0)', 'rgba(1, 2, 3, 1)', 'hsl(210, 50%, 40%)', 'navy',
    ]) {
        assert.throws(() => convertColorCode(input), /形式/, input);
    }
});
