import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePasswords, createSecureIndex, ALL_SYMBOLS, LETTER_SETS} from '../../resources/js/browser-password-engine.js';

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
test('custom characters deduplicate and never inject nonselected characters', () => {
    const results = generatePasswords({length: 128, count: 100, groups: ['symbols'], symbolMode: 'custom', customSymbols: '!!<<&&'});
    assert.equal(results.length, 100);
    assert.ok(results.every(result => /^[!<&]{128}$/.test(result)));
    assert.equal(ALL_SYMBOLS.length, 32);
});
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
test('uint32 tail is rejected before modulo so residues are equally represented', () => {
    let fills = 0;
    const pick = createSecureIndex({getRandomValues: values => {fills++; values.fill(5); values[0] = 4294967295;}});
    assert.equal(pick(10), 5);
    assert.equal(fills, 1);
});
test('no insecure random fallback when crypto is absent or fails', () => {
    assert.throws(() => createSecureIndex({}), /暗号用途/);
    const pick = createSecureIndex({getRandomValues: () => {throw new Error('random source unavailable');}});
    assert.throws(() => pick(10), /random source unavailable/);
});
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
