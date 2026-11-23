/** @file JSONの構文・字句保持・変換の受け入れ条件。 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { INPUT_LIMIT, parseJson } from '../../resources/js/json-tools-engine.js';
import { processJson } from '../../resources/js/json-tools-process.js';

const run = (operation, input, format = 'json', schema = '') => processJson({ operation, input, format, schema });

test('整形はエスケープ・大きな数・整数に見えるキーの原順序を保つ', () => {
    const input = '{"10":9007199254740993,"2":"00\\u0031 A","1":1.00e1}';
    assert.equal(run('format', input).output, '{\n  "10": 9007199254740993,\n  "2": "00\\u0031 A",\n  "1": 1.00e1\n}');
    assert.equal(run('minify', '\n ' + input + ' \t').output, input);
});

test('構文エラーの位置、UTF-16列、BOM、重複を扱う', () => {
    assert.throws(() => run('check', '{"a":1,}'), /1行目8列目/);
    assert.throws(() => run('check', '{\r\n"😀":1,}'), /2行目8列目/);
    assert.throws(() => run('check', '"x\\u009G"'), /1行目8列目/);
    assert.ok(run('check', '\uFEFFtrue').message);
    assert.throws(() => run('check', '\uFEFF\uFEFFtrue'), /1行目1列目/);
    const duplicate = '{"x":1,"\\u0078":2}';
    assert.match(run('check', duplicate).warning, /重複/);
    assert.equal(run('minify', duplicate).output, duplicate);
    assert.throws(() => run('csv', '[' + duplicate + ']'), /重複/);
    assert.throws(() => run('generate', duplicate), /重複/);
});

test('バイト数・入れ子・出力サイズの上限を守る', () => {
    assert.equal(parseJson('"' + 'a'.repeat(INPUT_LIMIT - 2) + '"').root.raw.length, INPUT_LIMIT);
    assert.throws(() => parseJson('"' + 'é'.repeat(INPUT_LIMIT / 2) + '"'), /1 MiB/);
    assert.ok(parseJson('['.repeat(64) + ']'.repeat(64)));
    assert.throws(() => parseJson('['.repeat(65) + ']'.repeat(65)), /64段/);
    const wide = '['.repeat(64) + '0,'.repeat(42000) + '0' + ']'.repeat(64);
    assert.throws(() => run('format', wide), /5 MiB/);
});

test('JSONLのLFとCRLFを受け付け、途中の空行を明示する', () => {
    assert.equal(run('format', ' { "id" : 1 }\r\n  null \n', 'jsonl').output, '{"id":1}\nnull\n');
    assert.throws(() => run('format', '{}\n\n[]\n', 'jsonl'), /2行目1列目/);
    assert.throws(() => run('format', '{}\n\uFEFF[]', 'jsonl'), /2行目1列目.*BOM/);
});

test('CSV出力は先頭キー順と値を保ち、先頭100行をプレビューする', () => {
    const result = run('csv', '[{"2":"ノート, A5","1":"00123"},{"1":9007199254740993,"2":"A\\"B"}]');
    assert.equal(result.output, '"2","1"\r\n"ノート, A5","00123"\r\n"A""B","9007199254740993"\r\n');
    assert.deepEqual(result.preview[1], ['ノート, A5', '00123']);
    const repeated = (count) => '[' + Array(count).fill('{"n":-1}').join(',') + ']';
    assert.equal(run('csv', repeated(5000)).preview.length, 101);
    assert.throws(() => run('csv', repeated(5001)), /5,000/);
    assert.throws(() => run('csv', '[{"a":1},{"z":2}]'), /2件目.*z/);
    assert.throws(() => run('csv', '[{"a":null}]'), /1件目.*"a"/);
    assert.throws(() => run('csv', '[{"a":" @name"}]'), /表計算/);
    assert.throws(() => run('csv', '[{"a":"\\uD800"}]'), /サロゲート/);
    assert.equal(run('csv', '[{"a":"🍞"}]').output, '"a"\r\n"🍞"\r\n');
});

test('ひな形は型を推定し、任意のキーと混在配列を扱う', () => {
    const result = JSON.parse(run('generate', '{"id":1.00e1,"__proto__":null,"items":[1,"x",1],"empty":[]}').output);
    assert.deepEqual(result.properties, JSON.parse('{"id":{"type":"integer"},"__proto__":{"type":"null"},"items":{"type":"array","items":{"anyOf":[{"type":"integer"},{"type":"string"}]}},"empty":{"type":"array"}}'));
    assert.equal(result.required, undefined);
});

test('Draft 2020-12のスキーマ定義を確認し、項目の位置を示す', () => {
    assert.match(run('schema-check', 'true', 'schema').message, /Draft 2020-12/);
    assert.throws(() => run('schema-check', '{"required":"id"}', 'schema'), /\/required.*array/);
    assert.throws(() => run('schema-check', '[]', 'schema'), /ルート/);
    assert.throws(() => run('schema-check', '{"$schema":"http://json-schema.org/draft-07/schema#"}', 'schema'), /\$schema.*2020-12/);
    assert.throws(() => run('schema-check', '{"$defs":{"rule":{"pattern":"["}}}', 'schema'), /\/\$defs\/rule\/pattern.*不正/);
});

test('同じ文書を参照し、照合結果にデータの位置を示す', () => {
    const schema = '{"$id":"https://example.com/item","$defs":{"quantity":{"type":"integer"}},"type":"array","items":{"properties":{"stock":{"$ref":"#/$defs/quantity"}}}}';
    assert.equal(run('validate', '[{"stock":3}]', 'json', schema).invalid, false);
    const result = run('validate', '[{"stock":"3"}]', 'json', schema);
    assert.equal(result.invalid, true);
    assert.match(result.message, /\/0\/stock.*integer/);
    assert.equal(run('validate', '["a",3]', 'json', '{"prefixItems":[{"type":"string"}],"items":{"type":"integer"}}').invalid, false);
    assert.equal(run('validate', '{"x":1,"z":2}', 'json', '{"allOf":[{"properties":{"x":true}}],"unevaluatedProperties":false}').invalid, true);
    assert.equal(run('validate', '{}', 'json', '{"const":{}}').invalid, false);
});

test('外部参照、スキーマ側の重複、精度を保てない数値を拒否する', () => {
    assert.throws(() => run('validate', '{}', 'json', '{"$defs":{"x":{"$ref":"https://example.com/outside"}}}'), /\$ref.*同一文書内/);
    assert.throws(() => run('validate', '{}', 'json', '{"$ref":"#/$defs/missing"}'), /読み込めません/);
    assert.throws(() => run('validate', '{}', 'json', '{"type":"object","type":"array"}'), /JSON Schema.*重複/);
    assert.throws(() => run('validate', '{"id":9007199254740993}', 'json', '{}'), /\/id.*精度/);
    assert.throws(() => run('validate', '1', 'json', '{"maximum":1.00000000000000001}'), /\/maximum.*精度/);
    assert.equal(run('validate', '{"$ref":"https://example.com/data"}', 'json', '{"enum":[{"$ref":"https://example.com/data"}]}').invalid, false);
});

test('10進の倍数と継承されたプロパティを誤判定しない', () => {
    assert.equal(run('validate', '0.3', 'json', '{"multipleOf":0.1}').invalid, false);
    assert.equal(run('validate', '-0.3', 'json', '{"multipleOf":0.1}').invalid, false);
    assert.equal(run('validate', '0.31', 'json', '{"multipleOf":0.1}').invalid, true);
    assert.equal(run('validate', '{}', 'json', '{"required":["toString"]}').invalid, true);
    assert.equal(run('validate', '{"__proto__":1}', 'json', '{"required":["__proto__"]}').invalid, false);
    assert.throws(() => run('validate', '{"__proto__":1}', 'json', '{"properties":{"__proto__":{"type":"string"}}}'), /\/properties\/__proto__.*対応/);
});

test('文字列の終端とエスケープ、区切りの異常を検出する', () => {
    assert.equal(run('minify', '"\\t\\n\\/"').output, '"\\t\\n\\/"');
    assert.equal(run('minify', '"\\u0030"').output, '"\\u0030"');
    assert.throws(() => run('check', '"abc'), /二重引用符/);
    assert.throws(() => run('check', '"a\nb"'), /制御文字/);
    assert.throws(() => run('check', '"\\v"'), /エスケープ/);
    assert.throws(() => run('check', '"\\'), /エスケープ/);
    assert.throws(() => run('check', '"\\u00'), /16進数字/);
    assert.throws(() => run('check', '{"x" 1}'), /コロン/);
    assert.throws(() => run('check', '[42 1]'), /カンマ/);
    assert.throws(() => run('check', 'false []'), /余分な文字/);
});

test('JSONLは容量と重複行を確認し、CSVは空配列と列数の違反を明示する', () => {
    assert.throws(() => run('format', ' '.repeat(INPUT_LIMIT + 1), 'jsonl'), /1 MiB/);
    assert.match(run('format', '{}\n{"x":1,"x":0}\n{"y":1,"y":0}', 'jsonl').warning, /2行目/);
    assert.throws(() => run('csv', '{}'), /空でない配列/);
    assert.throws(() => run('csv', '[]'), /空でない配列/);
    assert.throws(() => run('csv', '[{}]'), /1件目/);
    assert.throws(() => run('csv', '[null]'), /1件目/);
    assert.throws(() => run('csv', '[{"n":1},null]'), /2件目/);
    assert.throws(() => run('csv', '[{"n":1},{}]'), /キー "n" がありません/);
    const object = Object.fromEntries(Array.from({ length: 101 }, (_, index) => ['f' + index, false]));
    assert.throws(() => run('csv', JSON.stringify([object])), /100列/);
    assert.equal(run('csv', '[{"ok":false}]').output, '"ok"\r\n"false"\r\n');
});

test('整形はスキーマの拡張子とUTF-8の出力上限を扱う', () => {
    assert.equal(run('format', '{"type":"object"}', 'schema').suffix, '.schema.json');
    const value = '['.repeat(64) + '"📘",'.repeat(38500) + '0' + ']'.repeat(64);
    assert.throws(() => run('format', value), /5 MiB/);
    assert.throws(() => run('unknown', '{}'), /処理を選び直して/);
    assert.equal(JSON.parse(run('generate', '[0]').output).items.type, 'integer');
});

test('スキーマの入れ子に別ドラフトがある場合と、非整数の推定を確認する', () => {
    const base = '{"$schema":"https://json-schema.org/draft/2020-12/schema#","patternProperties":{"^x":{"type":"boolean"}}}';
    assert.match(run('schema-check', base, 'schema').message, /Draft 2020-12/);
    assert.throws(() => run('schema-check', '{"$schema":false}', 'schema'), /\$schema.*文字列/);
    assert.throws(() => run('schema-check', '{"properties":{"p":{"$schema":"https://json-schema.org/draft/2019-09/schema"}}}', 'schema'), /\/properties\/p\/\$schema/);
    assert.throws(() => run('schema-check', '{"dependentRequired":{"__proto__":["x"]}}', 'schema'), /\/dependentRequired\/__proto__/);
    assert.throws(() => run('validate', '1e10000', 'json', 'true'), /ルート.*精度/);
    assert.equal(JSON.parse(run('generate', '-0.01').output).type, 'number');
});
