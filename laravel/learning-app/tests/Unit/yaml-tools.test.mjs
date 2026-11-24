import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { processYaml } from '../../resources/js/yaml-tools-engine.js';

const fixture = name => readFileSync(new URL('../fixtures/yaml-tools/' + name, import.meta.url), 'utf8');
const run = (operation, input, indent = 2) => processYaml({ format: operation === 'to-yaml' ? 'json' : 'yaml', operation, input, indent });

test('4スペース入力を読み、コメントとブロックの値を保持して2・4スペースで保存する', () => {
    const input = fixture('settings.yaml');
    assert.equal(run('check', input).message, 'YAMLの構文は正しいです。');
    for (const indent of [2, 4]) {
        assert.equal(run('format', input, indent).output, fixture(`expected-${indent}.yaml`));
    }
    const block = 'note: |+\r\n  例\r\n\r\n';
    assert.deepEqual(JSON.parse(run('to-json', run('format', block, 4).output).output), { note: '例\n\n' });
    const flow = 'items: [one, two] # メモ\n';
    assert.match(run('format', flow).output, /# メモ/);
});

test('相互変換でキー順、型、日本語、日付風の文字列と空値を保持する', () => {
    assert.equal(run('to-json', fixture('settings.yaml')).output, fixture('expected.json'));
    const converted = run('to-yaml', fixture('input.json'), 4).output;
    assert.equal(converted, fixture('expected-from-json.yaml'));
    const reverse = run('to-json', converted).output;
    assert.ok(reverse.indexOf('"10"') < reverse.indexOf('"2"'));
    assert.deepEqual(JSON.parse(reverse), JSON.parse(fixture('input.json')));
    assert.equal(run('to-json', '""').output, '""\n');
    assert.equal(run('to-yaml', '""').output, '""\n');
    assert.equal(run('to-json', 'null').output, 'null\n');
    assert.equal(run('to-json', '[]').output, '[]\n');
    assert.equal(run('to-json', '{}').output, '{}\n');
    assert.equal(run('to-json', fixture('utf8-bom.yml')).output, '{\n  "name": "表示名"\n}\n');
});

test('構文、字下げ、重複キーとサポート外を位置付きで伝える', () => {
    assert.throws(() => run('check', fixture('invalid-indent.yaml')), /\d行目\d列目/);
    assert.throws(() => run('check', fixture('tab-indent.yaml')), /2行目1列目.*半角スペース/);
    assert.throws(() => run('check', fixture('duplicate.yaml')), /2行目.*重複/);
    assert.throws(() => run('to-yaml', '{"a":1,"\\u0061":2}'), /重複/);
    for (const [yaml, reason] of [
        [fixture('alias.yaml'), /アンカー/], ['{12: x}', /キー/],
        ['a: !!str 1', /明示タグ/], ['a: 1\n---\nb: 2', /複数文書/],
        ['<<: 1', /無引用/], ['%YAML 1.1\n---\na: 1', /YAML 1.2/],
        ['%YAML 1.3\n---\na: 1', /YAML 1.2/],
        [fixture('unquoted-code.yaml'), /先頭ゼロ/],
    ]) {
        assert.match(run('check', yaml).message, reason);
        assert.throws(() => run('format', yaml), reason);
        assert.throws(() => run('to-json', yaml), reason);
    }
    assert.throws(() => run('check', '# コメントだけ'), /データがありません/);
    assert.throws(() => run('check', '\uFEFF\uFEFFa: 1'), /BOM/);
});

test('数値の精度と入れ子・サイズ上限を確認する', () => {
    assert.equal(run('to-json', 'count: .5\nmax: 9007199254740991\nhex: 0xFF').output,
        '{\n  "count": 0.5,\n  "max": 9007199254740991,\n  "hex": 255\n}\n');
    for (const raw of ['9007199254740993', '1.0000000000000001', '1e400', '1e-400', '-0']) {
        assert.throws(() => run('to-json', 'n: ' + raw), /数値を精度/);
        assert.throws(() => run('to-yaml', '{"n":' + raw + '}'), /数値を精度/);
    }
    const nesting = depth => '['.repeat(depth) + '0' + ']'.repeat(depth);
    assert.match(run('check', nesting(64)).message, /正しい/);
    assert.throws(() => run('check', nesting(65)), /64段/);
    assert.throws(() => run('check', 'x'.repeat(1024 * 1024 + 1)), /1 MiB/);
});

test('正しくない処理指定と、整形で値が変わる入力は出力しない', () => {
    assert.throws(() => processYaml({ format: 'json', operation: 'check', input: '{}' }), /処理を選び直/);
    assert.throws(() => processYaml({ format: 'yaml', operation: 'to-yaml', input: '{}' }), /処理を選び直/);
    assert.throws(() => run('format', 'count: 1.0000000000000001'), /出力を停止/);
    assert.equal(run('format', 'count: 1.0').output, 'count: 1.0\n');
    assert.equal(run('to-yaml', '{"items":[true,null]}').output, '"items":\n  - true\n  - null\n');
    const allowed = 'x'.repeat(1024 * 1024);
    assert.match(run('check', allowed).message, /正しい/);
    const depth = 63;
    const expanding = '['.repeat(depth) + '[' + Array(42000).fill(0).join(',') + ']' + ']'.repeat(depth);
    assert.throws(() => run('to-json', expanding), /5 MiB/);
});
