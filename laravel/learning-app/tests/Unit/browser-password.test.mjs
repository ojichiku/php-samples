/** @file ブラウザー生成の条件、乱数末尾の棄却、再試行をNodeで検証する。生成値はログへ出さない。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePasswords, createSecureIndex, ALL_SYMBOLS, LETTER_SETS} from '../../resources/js/browser-password-engine.js';

// 全15種類の選択組合せと文字数の境界で、必要文字種と許可集合内だけの生成を確認する。
test('all selected groups, lengths and batch sizes remain within the allowed alphabet', () => {
    const names = [...Object.keys(LETTER_SETS), 'symbols'];
    for (let mask = 1; mask < 16; mask++) {
        const groups = names.filter((_, index) => mask & (1 << index));
        for (const length of [8, 16, 128]) {
            const results = generatePasswords({length, count: 10, groups, symbolMode: 'all'});
            assert.equal(results.length, 10);
            const sets = groups.map(group => group === 'symbols' ? ALL_SYMBOLS : LETTER_SETS[group]);
            for (const result of results) {
                assert.equal(result.length, length);
                assert.ok([...result].every(character => sets.join('').includes(character)));
                for (const characters of sets) assert.ok([...result].some(character => characters.includes(character)));
            }
        }
    }
});
// 指定記号の重複を除き、英数など未選択の文字を混ぜないことを確認する。
test('custom characters deduplicate and never inject nonselected characters', () => {
    const results = generatePasswords({length: 128, count: 100, groups: ['symbols'], symbolMode: 'custom', customSymbols: '!!<<&&'});
    assert.equal(results.length, 100);
    assert.ok(results.every(result => /^[!<&]{128}$/.test(result)));
    assert.equal(ALL_SYMBOLS.length, 32);
});
// 範囲外の数値、未知キー、ASCII記号でない指定を拒否する。
test('malformed options fail rather than falling back to defaults', () => {
    const base = {length: 16, count: 1, groups: ['lowercase']};
    for (const options of [{length: 7}, {length: 129}, {length: NaN}, {length: 8.5}, {count: 0}, {count: 101}, {count: 1.5}, {groups: []}, {groups: ['unknown']}, {groups: ['toString']}, {groups: [['lowercase']]}]) {
        assert.throws(() => generatePasswords({...base, ...options}));
    }
    assert.throws(() => generatePasswords({...base, groups: ['symbols'], symbolMode: 'toString'}));
    for (const customSymbols of ['', ' ', 'a!', '！', '<script>', '☃', '\n!']) {
        assert.throws(() => generatePasswords({...base, groups: ['symbols'], symbolMode: 'custom', customSymbols}));
    }
});
// 乱数源を固定し、uint32の端の値を棄却して次の値を使うことを確認する。
test('uint32 tail is rejected before modulo so residues are equally represented', () => {
    let fills = 0;
    const pick = createSecureIndex({getRandomValues: values => {fills++; values.fill(5); values[0] = 4294967295;}});
    assert.equal(pick(10), 5);
    assert.equal(fills, 1);
});
// 乱数機能の不在/失敗時に、安全性の低い別方式へ切り替えないことを確認する。
test('no insecure random fallback when crypto is absent or fails', () => {
    assert.throws(() => createSecureIndex({}), /暗号用途/);
    const pick = createSecureIndex({getRandomValues: () => {throw new Error('random source unavailable');}});
    assert.throws(() => pick(10), /random source unavailable/);
});
// 必要文字種が欠けた候補は捨て、次の候補全体を生成し直すことを確認する。
test('candidates missing a required character group are retried, not patched with biased characters', () => {
    let calls = 0;
    const poolLength = LETTER_SETS.lowercase.length + LETTER_SETS.numbers.length;
    const result = generatePasswords({length: 8, count: 1, groups: ['lowercase', 'numbers']}, () => {
        calls++;
        return calls === 9 ? poolLength - 1 : 0;
    });
    assert.equal(calls, 16);
    assert.match(result[0], /[0-9]/);
    assert.match(result[0], /[a-z]/);
});

test('無効な乱数範囲と規定回数までに条件を満たせない候補を拒否する', () => {
    const pick = createSecureIndex({ getRandomValues: () => assert.fail('乱数を要求する前に範囲を検査する') });
    for (const size of [0, 1.5, 2 ** 32 + 1]) {
        assert.throws(() => pick(size), /抽選範囲/);
    }
    let calls = 0;
    assert.throws(() => generatePasswords({ length: 8, count: 1, groups: ['lowercase', 'numbers'] }, () => {
        calls += 1;
        return 0;
    }), /生成に失敗しました/);
    assert.equal(calls, 80000);
});
