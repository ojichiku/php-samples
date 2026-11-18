/** @file 整数比の入力境界と四捨五入をDOMなしで検証する。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDecimal, rounded } from '../../resources/js/calculation-tools-engine.js';

test('10進数と全角数字を丸めずに整数比へ変換する', () => {
    assert.deepEqual(parseDecimal('０.１', 'value', '値'), { n: 1n, d: 10n, text: '0.1' });
    assert.equal(parseDecimal('999999999.9999', 'value', '値').n, 9999999999999n);
});
test('禁止書式と上限超過、小数桁数、ゼロ分母を拒否する', () => {
    for (const raw of ['', '-1', '1e3', '1,000', '1.12345', '1000000000', '9'.repeat(1000)]) {
        assert.throws(() => parseDecimal(raw, 'value', '値'), error => error.inputId === 'value');
    }
    assert.throws(() => parseDecimal('0', 'value', '値', 4, 999999999n, true));
    assert.throws(() => parseDecimal('100.01', 'rate', '率', 2, 100n));
    assert.throws(() => parseDecimal('1000000.0001', 'rate', '率', 4, 1000000n));
    assert.throws(() => parseDecimal('1.1', 'yen', '金額', 0));
    assert.equal(parseDecimal('1000000', 'rate', '率', 4, 1000000n).n, 1000000n);
});
test('四捨五入と約表示、末尾ゼロ省略、大きな値の精度を保証する', () => {
    assert.equal(rounded(100n, 3n), '約33.3333');
    assert.equal(rounded(1n, 20000n), '約0.0001');
    assert.equal(rounded(1n, 100000n), '約0');
    assert.equal(rounded(1n, 10n), '0.1');
    assert.equal(rounded(9999999999999000000n, 1n), '9,999,999,999,999,000,000');
});
