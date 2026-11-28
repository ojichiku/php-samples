/** @file 基数の入力範囲、整数の書式、精度、桁数を確認する。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { convertRadixInteger, parseRadix } from '../../resources/js/radix-converter-engine.js';

test('自由入力の基数を半角数字の2〜36に限定する', () => {
    assert.equal(parseRadix(''), null);
    assert.equal(parseRadix(' \t'), null);
    assert.equal(parseRadix(' 02 '), 2);
    assert.equal(parseRadix('36'), 36);
    for (const rawBase of ['+2', '2.5', '２', '1', '37', '3 6', '9'.repeat(400)]) {
        assert.throws(() => parseRadix(rawBase), /基数は2〜36/);
    }
});

test('定番および任意の基数を指定して整数を変換する', () => {
    assert.equal(convertRadixInteger('255', 10, 16), 'FF');
    assert.equal(convertRadixInteger('255', 10, 3), '100110');
    assert.equal(convertRadixInteger('17', 8, 2), '1111');
    assert.equal(convertRadixInteger('Z', 36, 10), '35');
    assert.equal(convertRadixInteger('0xFF', 36, 36), 'XFF');
});

test('前後の空白と符号を受け付け、ゼロと英字を正規化する', () => {
    assert.equal(convertRadixInteger(' \n-000f \t', 16, 16), '-F');
    assert.equal(convertRadixInteger('+000f', 16, 16), 'F');
    assert.equal(convertRadixInteger('-0', 10, 2), '0');
    assert.equal(convertRadixInteger('   ', 10, 16), '');
});

test('内部の空白・改行・書式違いを拒否し、基数ごとの桁も検証する', () => {
    for (const integer of ['1.2', '1,000', '1 2', '1\n2', '-', '++1', '＋1', '１２']) {
        assert.throws(() => convertRadixInteger(integer, 10, 16), /半角の英数字と先頭の符号/);
    }
    assert.throws(() => convertRadixInteger('102', 2, 10), /2進数では「2」/);
    assert.throws(() => convertRadixInteger('0xFF', 16, 10), /16進数では「X」/);
    assert.throws(() => convertRadixInteger('255', 10, 2.5), /基数は2〜36/);
    assert.throws(() => convertRadixInteger('FF', 37, 10), /基数は2〜36/);
});

test('安全な整数の上限を超える値も丸めず、最大1024桁を処理する', () => {
    assert.equal(convertRadixInteger('9007199254740993', 10, 16), '20000000000001');
    const digits = '1'.repeat(1024);
    assert.equal(convertRadixInteger(` +${digits} `, 10, 16), BigInt(digits).toString(16).toUpperCase());
    assert.throws(() => convertRadixInteger(`-${digits}1`, 10, 16), /1024桁まで/);
});
