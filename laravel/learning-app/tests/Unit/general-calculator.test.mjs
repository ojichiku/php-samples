/** @file 一般電卓の式、精度とエラー条件を検証する。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { calculate, EXPRESSION_LIMIT } from '../../resources/js/general-calculator-engine.js';

test('演算順位と小数が正確で、表示だけを四捨五入する', () => {
    for (const [expression, expected] of [
        ['2+3*4', '14'], ['（２＋３）×４', '20'], ['8÷4/2', '1'], ['4/-2', '-2'], ['8−4-2', '2'],
        ['-2^2', '-4'], ['(-2)^2', '4'], ['2^3^2', '512'], ['2^-3', '0.125'],
        ['.5+0.25', '0.75'], ['+5.', '5'], ['0.1+0.2-0.3', '0'], ['-0', '0'],
        ['0.000000000001/2*2', '0.000000000001'], ['1000000000000', '1000000000000'],
        ['1000000000000-999999999999-0.999999999999', '0.000000000001'],
        ['10/3', '3.33333333333'], ['-10/3', '-3.33333333333'],
        ['999999999999+0.75', '1000000000000'], ['1234567/1000000000000', '0.000001234567'],
    ]) assert.equal(calculate(expression, 'DEG').text, expected, expression);
    assert.deepEqual(calculate('0.1+0.2', 'DEG'), {text: '0.3', approximate: false});
    assert.deepEqual(calculate('1/3*3', 'DEG'), {text: '1', approximate: false});
    assert.deepEqual(calculate('1/3', 'DEG'), {text: '0.333333333333', approximate: true});
});

test('平方根、三角関数、対数、後置％と円周率を使える', () => {
    for (const [expression, expected, angle = 'DEG'] of [
        ['sqrt(9)+abs(-2)', '5'], ['sqrt(2)', '1.41421356237'], ['abs(0)', '0'],
        ['sin(30)', '0.5'], ['cos(180)', '-1'], ['sin(180)', '0'], ['tan(-180)', '0'],
        ['cos(60)', '0.5'], ['tan(45)', '1'], ['sin(π/6)', '0.5', 'RAD'], ['sin(pi)', '0', 'RAD'],
        ['cos(-pi)', '-1', 'RAD'], ['pi', '3.14159265359'], ['log(1000)', '3'], ['ln(1)', '0'],
        ['log(0.1^1000)', '-1000'], ['ln(1+0.000001)', '0.0000009999995'],
        ['4^0.5', '2'], ['(1.00000000001)^1000000000000', '22026.4657937'],
        ['(-1)^100000000001', '-1'], ['sqrt(0.1^1000)/(0.1^500)', '1'],
        ['10%', '0.1'], ['200*10%', '20'], ['200+10%', '200.1'], ['200*(1+10%)', '220'],
    ]) assert.equal(calculate(expression, angle).text, expected, expression);
    assert.deepEqual(calculate('sqrt(9)', 'DEG'), {text: '3', approximate: false});
    assert(calculate('sqrt(2)', 'DEG').approximate);
    assert(calculate('pi', 'DEG').approximate);
});

test('定義域、範囲、許可しない式と深さに理由を返す', () => {
    for (const [expression, reason, angle = 'DEG'] of [
        ['1/0', /0で割る/], ['sqrt(-1)', /平方根/], ['(-2)^0.5', /整数/],
        ['0^0', /定義/], ['0^-1', /定義/], ['tan(90)', /定義/], ['tan(pi/2)', /定義/, 'RAD'],
        ['log(0)', /正の数/], ['ln(-1)', /正の数/], ['10%%', /4文字目/], ['%', /1文字目/],
        ['2(3+4)', /2文字目/], ['2+', /3文字目/], ['(1+2', /閉じ括弧/], ['sin30', /括弧/],
        ['unknown(2)', /一覧/], ['1e-3', /2文字目/], ['1,000', /2文字目/], ['2²', /2文字目/],
        ['1000000000001', /12桁/], ['2000000000000', /1兆/], ['1000000000000*2/2', /1兆/],
        ['0.000000000001/2', /未満/], ['0.01^100000', /桁数/], ['2^100000', /範囲/],
        ['0.1^2000*0.1^2000*0.1^100', /桁数/], ['sin(0.1^1000)', /桁数/], ['ln(1+0.1^1000)', /桁数/],
        ['1\n2', /改行/], ['1'.repeat(EXPRESSION_LIMIT + 1), /256/],
        [`${'('.repeat(33)}1${')'.repeat(33)}`, /32段/],
    ]) assert.throws(() => calculate(expression, angle), reason, expression);
    assert.equal(calculate(' '.repeat(EXPRESSION_LIMIT - 1) + '1', 'DEG').text, '1');
    assert.equal(calculate('('.repeat(32) + '1' + ')'.repeat(32), 'DEG').text, '1');
});
