/** @file Draft 2020-12のJSON Schema生成と、スキーマ検証用の精度を保つ入力変換。 */
import Ajv2020 from 'ajv/dist/2020.js';
import { JsonToolError } from './json-tools-engine.js';

export const DRAFT = 'https://json-schema.org/draft/2020-12/schema';

/**
 * 数値の綴りから符号・有効数字・10の指数を求める。
 * @param {string} raw 構文チェック済みのJSON数値。
 * @returns {{negative: boolean, digits: string, exponent: number}} ゼロと桁を正規化した数値の構成。
 */
function decimal(raw) {
    const [mantissa, exponent = '0'] = raw.toLowerCase().split('e');
    const negative = mantissa.startsWith('-');
    const [whole, fraction = ''] = mantissa.replace(/^-/u, '').split('.');
    const significant = (whole + fraction).replace(/^0+/u, '');
    if (!significant) return { negative: false, digits: '0', exponent: 0 };
    const digits = significant.replace(/0+$/u, '');
    return { negative, digits, exponent: Number(exponent) - fraction.length + significant.length - digits.length };
}

/**
 * 観測した値だけを使い、必須・値域を追加せずスキーマを作る。
 * @param {import('./json-tools-engine.js').JsonNode} root 重複キーを除外した構文木。
 * @returns {string} 2空白で整形したDraft 2020-12のひな形。
 */
export function generateSchema(root) {
    /**
     * @param {import('./json-tools-engine.js').JsonNode} node 部分木。
     * @returns {object} 観測した型の定義。
     */
    function infer(node) {
        if (node.type === 'object') {
            return { type: 'object', properties: Object.fromEntries(node.entries.map(({ key, node }) => [key.value, infer(node)])) };
        }
        if (node.type === 'array') {
            const itemSchemas = new Map();
            for (const item of node.items) {
                const schema = infer(item);
                itemSchemas.set(JSON.stringify(schema), schema);
            }
            const choices = [...itemSchemas.values()];
            if (!choices.length) return { type: 'array' };
            return { type: 'array', items: choices.length === 1 ? choices[0] : { anyOf: choices } };
        }
        if (node.type === 'number' && decimal(node.raw).exponent >= 0) return { type: 'integer' };
        return { type: node.type };
    }
    return JSON.stringify({ $schema: DRAFT, ...infer(root) }, null, 2);
}

/**
 * @param {string} key JSONオブジェクトのキー。
 * @returns {string} JSON Pointerの1区画。
 */
function escapePointer(key) {
    return key.replaceAll('~', '~0').replaceAll('/', '~1');
}

/**
 * 検証器に渡す前に、JavaScriptの数値化で桁を失う値を止める。
 * @param {import('./json-tools-engine.js').JsonNode} node JSONの構文木。
 * @param {string} path 先頭スラッシュ付きのJSON Pointer。ルートは空。
 * @returns {unknown} 検証器用のJSON値。
 * @throws {JsonToolError} 数値の範囲や精度を保持できない場合。
 */
function validationValue(node, path = '') {
    if (node.type === 'object') {
        return Object.fromEntries(node.entries.map(({ key, node }) => [key.value, validationValue(node, path + '/' + escapePointer(key.value))]));
    }
    if (node.type === 'array') return node.items.map((item, index) => validationValue(item, path + '/' + index));
    if (node.type === 'string') return node.value;
    if (node.type !== 'number') return JSON.parse(node.raw);

    const value = Number(node.raw);
    const original = decimal(node.raw);
    const normalized = decimal(String(value));
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))
        || original.negative !== normalized.negative || original.digits !== normalized.digits || original.exponent !== normalized.exponent) {
        throw new JsonToolError(`${path || 'ルート'}：数値の精度を保って検証できません。`);
    }
    return value;
}

/**
 * 10進数の倍数判定。2進の小数除算による誤判定を避ける。
 * @param {number} divisor 正のJSON数値。
 * @param {number} value 検証するJSON数値。
 * @returns {boolean} 10進数として割り切れる場合は真。
 */
function isMultipleOf(divisor, value) {
    const a = decimal(String(value));
    const b = decimal(String(divisor));
    const scale = Math.min(a.exponent, b.exponent);
    const scaled = (part) => BigInt(part.digits) * 10n ** BigInt(part.exponent - scale);
    return scaled(a) % scaled(b) === 0n;
}

const namedSubschemas = ['$defs', 'definitions', 'properties', 'patternProperties', 'dependentSchemas', 'dependencies'];
const arraySubschemas = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];
const singleSubschemas = [
    'items', 'contains', 'additionalProperties', 'propertyNames', 'if', 'then', 'else', 'not',
    'unevaluatedItems', 'unevaluatedProperties', 'contentSchema',
];

/**
 * スキーマとして評価される位置だけを巡回し、未対応の参照等を拒否する。
 * @param {unknown} definition 構文・定義をチェックしたスキーマまたは部分スキーマ。
 * @param {string} path 部分スキーマのJSON Pointer。
 * @returns {void}
 * @throws {JsonToolError} 対応範囲外や無効な正規表現。
 */
function checkSchemaSupport(definition, path = '') {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) return;
    if (typeof definition.$schema === 'string' && ![DRAFT, DRAFT + '#'].includes(definition.$schema)) {
        throw new JsonToolError(`JSON Schema ${path}/$schema：Draft 2020-12に対応しています。`);
    }
    for (const keyword of ['$ref', '$dynamicRef', '$recursiveRef']) {
        const reference = definition[keyword];
        if (typeof reference === 'string' && reference && !reference.startsWith('#')) {
            throw new JsonToolError(`JSON Schema ${path}/${keyword}：同一文書内のフラグメント参照を指定してください。`);
        }
    }

    /** @param {string} pattern 正規表現。 @param {string} position 正規表現の位置。 @returns {void} */
    function checkPattern(pattern, position) {
        try {
            new RegExp(pattern, 'u');
        } catch {
            throw new JsonToolError(`JSON Schema ${position}：正規表現が不正です。`);
        }
    }

    if (typeof definition.pattern === 'string') checkPattern(definition.pattern, path + '/pattern');

    for (const keyword of namedSubschemas) {
        const entries = Object.entries(definition[keyword] ?? {});
        for (const [name, child] of entries) {
            const position = path + '/' + keyword + '/' + escapePointer(name);
            // Ajvは名前付きキーワード内のこのキーを無視するため、適合と誤判定しないよう明示的に止める。
            if (name === '__proto__') throw new JsonToolError(`JSON Schema ${position}：この位置の __proto__ は検証に対応していません。`);
            if (keyword === 'patternProperties') checkPattern(name, position);
            checkSchemaSupport(child, position);
        }
    }
    for (const keyword of arraySubschemas) {
        definition[keyword]?.forEach((child, index) => checkSchemaSupport(child, path + '/' + keyword + '/' + index));
    }
    for (const keyword of singleSubschemas) {
        checkSchemaSupport(definition[keyword], path + '/' + keyword);
    }
    if (Object.hasOwn(definition.dependentRequired ?? {}, '__proto__')) {
        throw new JsonToolError(`JSON Schema ${path}/dependentRequired/__proto__：この位置の __proto__ は検証に対応していません。`);
    }
}

/**
 * エラーから入力欄、該当するキー、条件を読み取れるメッセージを作る。
 * @param {import('ajv').ErrorObject} error Ajvが報告した不適合。
 * @param {string} label JSON入力またはJSON Schema。
 * @returns {string} JSON Pointerつきのエラー案内。
 */
function describeError(error, label) {
    let path = error.instancePath;
    const key = error.params.missingProperty ?? error.params.additionalProperty ?? error.params.unevaluatedProperty;
    if (typeof key === 'string') path += '/' + escapePointer(key);
    const reason = error.keyword === 'type' ? `型は ${error.params.type} が必要です。`
        : error.keyword === 'required' ? '必須項目がありません。'
            : `${error.keyword} の条件を満たしていません（${error.message}）。`;
    return `${label} ${path || 'ルート'}：${reason}`;
}

/**
 * 1回の処理専用のAjvで定義を確認し、同一文書内の参照だけを使う検証関数を作る。
 * @param {import('./json-tools-engine.js').JsonNode} root スキーマの構文木。
 * @returns {import('ajv').ValidateFunction} 生成した検証関数。
 * @throws {JsonToolError} 不正または対応外の定義。
 */
export function compileSchema(root) {
    const schema = validationValue(root);
    if (root.type !== 'object' && root.type !== 'boolean') {
        throw new JsonToolError('JSON Schemaのルートはオブジェクトまたは真偽値が必要です。');
    }
    // format は Draft 2020-12 の注釈として扱う。入力の変更や外部参照取得を有効化しない。
    const ajv = new Ajv2020({ strict: false, ownProperties: true, validateFormats: false, addUsedSchema: false });
    ajv.removeKeyword('multipleOf').addKeyword({ keyword: 'multipleOf', type: 'number', schemaType: 'number', validate: isMultipleOf });
    if (typeof schema.$schema === 'string' && ![DRAFT, DRAFT + '#'].includes(schema.$schema)) {
        throw new JsonToolError('JSON Schema /$schema：Draft 2020-12に対応しています。');
    }
    if (Object.hasOwn(schema, '$schema') && typeof schema.$schema !== 'string') {
        throw new JsonToolError('JSON Schema /$schema：文字列が必要です。');
    }
    if (!ajv.validateSchema(schema)) throw new JsonToolError(describeError(ajv.errors[0], 'JSON Schema'));
    checkSchemaSupport(schema);
    try {
        return ajv.compile(schema);
    } catch (error) {
        throw new JsonToolError('JSON Schemaを検証用に読み込めません。' + error.message);
    }
}

/**
 * データをスキーマと照合する。
 * @param {import('./json-tools-engine.js').JsonNode} data JSONデータの構文木。
 * @param {import('./json-tools-engine.js').JsonNode} schema JSON Schemaの構文木。
 * @returns {{invalid: boolean, message: string}} 照合結果と該当箇所。
 */
export function validateAgainstSchema(data, schema) {
    const validate = compileSchema(schema);
    if (validate(validationValue(data))) return { invalid: false, message: 'スキーマに適合しています。' };
    return { invalid: true, message: 'スキーマに適合していません。\n' + describeError(validate.errors[0], 'JSON入力') };
}
