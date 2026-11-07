import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processText, countText } from '../../resources/js/text-tools-engine.js';
import { generateSamples } from '../../resources/js/text-tools-samples.js';
const run = options => processText({ flags: 'u', ...options });
test('counts graphemes, whitespace and trailing lines without counting wrapping', () => {
    assert.deepEqual(countText('👨‍👩‍👧‍👦e\u0301 A\r\n'), { characters: 4, withoutSpaces: 3, lines: 2 });
    assert.deepEqual(countText(''), { characters: 0, withoutSpaces: 0, lines: 0 });
});
test('formatting preserves inner spaces and treats whitespace-only rows explicitly', () => {
    assert.equal(run({ tool: 'format', text: ' a b \r\n　\t\r\nc ', operation: 'trim' }).output, 'a b\n\nc');
    assert.equal(run({ tool: 'format', text: 'a\n \n\n\tb', operation: 'collapse' }).output, 'a\n\n\tb');
    assert.equal(run({ tool: 'format', text: ' \n\t', operation: 'blank' }).output, '');
});
test('line sorting is by codepoints, duplicates are exact and empty rows retained', () => {
    assert.equal(run({ tool: 'lines', text: '10\n2\n1', operation: 'asc' }).output, '1\n10\n2');
    assert.equal(run({ tool: 'lines', text: 'a\na\nA\na \n', operation: 'unique' }).output, 'a\nA\na \n');
    assert.equal(run({ tool: 'lines', text: '\u{10000}\n\uffff', operation: 'asc' }).output, '\uffff\n\u{10000}');
});
test('literal replacement never interprets regex or dollar syntax', () => {
    assert.equal(run({ tool: 'replace', text: 'a.a.', search: '.', replacement: '$1' }).output, 'a$1a$1');
    assert.equal(run({ tool: 'replace', text: 'aaa', search: 'aa', replacement: 'b' }).output, 'ba');
});
test('regex substitution agrees with native JS including groups and context', () => {
    for (const [pattern, template, text] of [
        ['(\\d{4})-(\\d{2})-(\\d{2})', '$1/$2/$3', '2026-11-07'],
        ['(?<x>a)(b)?', '$<x>:$2:$&:$$', 'a ab'],
        ['(a)', "$12 $01 $0 $99 $` $'", 'zaq'],
        ['(?:)', '-', '😀a'],
    ]) assert.equal(run({ tool: 'replace', text, mode: 'regex', pattern, replacement: template }).output, text.replace(new RegExp(pattern, 'gu'), template));
});
test('converts only matched parts, respects width targets and retains kana', () => {
    assert.equal(run({ tool: 'convert', text: 'abc Def', mode: 'regex', pattern: '[a-z]+', operation: 'upper' }).output, 'ABC DEF');
    assert.equal(run({ tool: 'convert', text: 'Ａ１！　カ', operation: 'half', targets: ['letters', 'numbers'] }).output, 'A1！　カ');
    assert.equal(run({ tool: 'convert', text: 'A1! カ', operation: 'full', targets: ['letters', 'numbers', 'symbols', 'space'] }).output, 'Ａ１！　カ');
});
test('matches return positions and captures, Unicode empty matches always advance', () => {
    const r = run({ tool: 'match', text: '😀a\r\n12', pattern: '(\\d+)' });
    assert.equal(r.matches[0].row, 2); assert.equal(r.matches[0].column, 1); assert.deepEqual(r.matches[0].captures, ['12']);
    assert.equal(run({ tool: 'match', text: '😀', pattern: '(?:)' }).count, 2);
    assert.equal(run({ tool: 'match', text: '', pattern: '^$' }).count, 1);
    assert.equal(run({ tool: 'match', text: 'a'.repeat(1001), pattern: 'a' }).truncated, true);
});
test('rejects invalid input and output expansion without truncating', () => {
    assert.throws(() => run({ tool: 'match', pattern: '[' }), /構文/);
    assert.throws(() => run({ tool: 'match', pattern: 'a', flags: 'uu' }), /フラグ/);
    assert.throws(() => run({ tool: 'match', text: 'a'.repeat(100001), pattern: 'a' }), /10万/);
    assert.throws(() => run({ tool: 'replace', text: 'a'.repeat(10000), search: 'a', replacement: 'b'.repeat(1000) }), /100万/);
    assert.throws(() => run({ tool: 'replace', mode: 'regex', text: 'a'.repeat(10000), pattern: 'a', replacement: 'b'.repeat(1000) }), /100万/);
});
test('constructs examples then verifies whole match and reports finite shortages', () => {
    for (const pattern of ['[A-Z]{2}[0-9]{3}', '^(ab|cd){2,4}$', '\\d+\\w?\\s', '[a-c]\\n\\t', 'a*', '(?:a|b)?']) {
        const result = generateSamples(pattern, 'u', 5);
        assert.ok(result.count > 0);
        for (const sample of result.samples) {
            const match = new RegExp(pattern, 'u').exec(sample); assert.equal(match.index, 0); assert.equal(match[0], sample);
        }
    }
    assert.equal(generateSamples('fixed', 'u', 3).count, 1);
    assert.deepEqual(generateSamples('^$', 'u', 2).samples, ['']);
});
test('sample generator explicitly rejects unsupported constructs and bounded repetition', () => {
    for (const pattern of ['(?=a)a', '(a)\\1', '[^a]', '.', '\\p{L}', '(?<name>a)', 'a{2,}', 'a??', 'あ', 'a\\b']) {
        assert.throws(() => generateSamples(pattern, 'u', 1), /未対応/);
    }
    assert.throws(() => generateSamples('a{101}', 'u', 1), /100/);
    assert.throws(() => generateSamples('a', 'i', 1), /uのみ/);
    assert.equal(generateSamples('(a{100}){100}', 'u', 1).count, 0);
});

test('column positions remain codepoint-based even when regex splits a surrogate pair', () => {
    const result = run({ tool: 'match', text: '😀a\nb', pattern: '.', flags: '' });
    assert.deepEqual(result.matches.map(match => [match.row, match.column]), [[1, 1], [1, 1], [1, 2], [2, 1]]);
});

test('batch edit preserves original, runs only selected operations and follows documented order', () => {
    const text = ' Ｂ２ \n a1 \n Ｂ２ \n\n';
    const options = { tool: 'edit', text, width: 'half', targets: ['letters', 'numbers'], letterCase: 'lower', trim: true, blank: 'blank', unique: true, sort: 'asc', replaceEnabled: true, rules: [{search: 'b', replacement:'c'}, {search:'c', replacement:'d'}] };
    assert.equal(run(options).output, 'a1\nd2');
    assert.equal(options.text, text);
    assert.equal(run({tool:'edit',text}).output,text);
    assert.equal(run({...options,sort:'desc'}).output,'d2\na1');
    assert.equal(run({tool:'edit',text:'aaa',replaceEnabled:true,rules:[{search:'a',replacement:''},{search:'b',replacement:'c'}]}).output,'');
    assert.throws(()=>run({tool:'edit',text:'abc',replaceEnabled:true,rules:[{search:'',replacement:'x'}]}),/検索語/);
    assert.equal(run({tool:'edit',text:'abc DEF',scope:'regex',pattern:'[a-z]+',letterCase:'upper'}).output,'ABC DEF');
    assert.equal(run({tool:'edit',text:'2026-11',replaceEnabled:true,rules:[{mode:'regex',search:'(\\d{4})-(\\d{2})',replacement:'$1/$2'}]}).output,'2026/11');
});
test('pattern builder escapes literals, generalizes explicitly and validates both kinds of example', () => {
    for (const text of ['ABC-123','a.b+$[](){}?^|\\','日本語😀\n']) {
        const result=run({tool:'build',text});
        const regex=new RegExp(result.output,'u');
        assert.ok(regex.test(text));assert.ok(!regex.test(text+'\n'));assert.ok(!regex.test('x'+text));
    }
    const result=run({tool:'build',text:'ABC-123',buildMode:'general',positive:'XYZ-456\nwrong',negative:'abc-123\nABC-123'});
    assert.deepEqual(result.checks.map(c=>c.passed),[true,false,true,false]);
    assert.ok(new RegExp(result.output,'u').test('XYZ-456'));
    assert.throws(()=>run({tool:'build',text:'a'.repeat(1001)}),/1,000/);
});
