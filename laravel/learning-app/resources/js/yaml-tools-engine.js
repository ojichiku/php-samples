/** @file YAML 1.2の検査、値を保持する整形、JSONとの相互変換。 */
import { isAlias, isMap, isScalar, isSeq, LineCounter, parseAllDocuments, Scalar } from 'yaml';
import { INPUT_LIMIT, limitOutput, parseJson, writeJson } from './json-tools-engine.js';

const encoder = new TextEncoder();
const maxDepth = 64;

/**
 * 十進数を有効数字と指数に分け、書式による違いを除く。
 * @param {string} text 通常または指数表記の数値原文。
 * @returns {string|null} 比較用の値。十進表記以外はnull。
 */
function decimal(text) {
    const parts = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
    if (!parts) return null;
    const fraction = parts[3] ?? '';
    const significant = (parts[2] + fraction).replace(/^0+/, '');
    const sign = parts[1] === '-' ? '-' : '';
    if (!significant) return sign + '0';
    const digits = significant.replace(/0+$/, '');
    const exponent = Number(parts[4] ?? 0) - fraction.length + significant.length - digits.length;
    return sign + digits + 'e' + (Number.isSafeInteger(exponent) ? exponent : parts[4]);
}

/**
 * YAMLストリームを解析し、位置付きの構文エラーを返す。
 * @param {string} source BOM除去後の入力。
 * @returns {{documents: import('yaml').Document[], location: (offset: number) => string}} 文書と位置変換。
 */
function read(source) {
    const counter = new LineCounter();
    const location = (offset) => {
        const { line, col } = counter.linePos(offset);
        return `${line}行目${col}列目`;
    };
    let documents;
    try {
        documents = parseAllDocuments(source, { version: '1.2', schema: 'core', intAsBigInt: true, lineCounter: counter });
    } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        throw new Error('入れ子は64段までです。');
    }
    const errors = documents.flatMap(document => document.errors).sort((a, b) => a.pos[0] - b.pos[0]);
    const first = errors[0];
    if (first) {
        const message = {
            TAB_AS_INDENT: '字下げにタブは使えません。半角スペースに置き換えてください。',
            DUPLICATE_KEY: '同じキーが重複しています。',
            BAD_INDENT: '字下げを確認してください。',
        }[first.code] ?? first.message.replace(/ at line \d+, column \d+:[\s\S]*$/, '');
        throw new Error(location(first.pos[0]) + '：' + message);
    }
    if (!documents.length || documents.every(doc => isScalar(doc.contents) && doc.contents.type === Scalar.PLAIN && doc.contents.range[0] === doc.contents.range[1])) {
        throw new Error('文書にデータがありません。');
    }
    return { documents, location };
}

/**
 * 変換対象を確認し、構文木を走査順のまま比較用の形にする。
 * @param {import('yaml').Document[]} documents YAMLの解析結果。
 * @param {(offset: number) => string} location 位置の表示関数。
 * @param {boolean} converting JSONとの相互変換か。
 * @returns {{restriction: string, tree: object|null, comments: Array, signature: Array}} 制約と値・コメントの比較情報。
 */
function inspect(documents, location, converting) {
    const document = documents[0];
    const comments = [];
    const signature = [];
    const restrictions = [];
    const limit = (offset, reason) => restrictions.push({ offset, reason });
    if (documents.length > 1) limit(documents[1].range[0], '複数文書は整形・変換できません。');
    if (document.directives.yaml.version !== '1.2') limit(document.range[0], 'YAML 1.2の文書にしてください。');
    for (const warning of document.warnings) {
        if (warning.code === 'BAD_DIRECTIVE') limit(warning.pos[0], '対応する文書指定は %YAML 1.2 です。');
    }
    const rememberComments = (node, path) => {
        if (node?.commentBefore != null) comments.push([path, 'before', node.commentBefore]);
        if (node?.comment != null) comments.push([path, 'after', node.comment]);
    };
    rememberComments(document, '');

    function walk(node, depth, path, offset = 0) {
        offset = node?.range?.[0] ?? offset;
        rememberComments(node, path);
        if (node?.tag) limit(offset, '明示タグは整形・変換できません。');
        if (node?.anchor || isAlias(node)) limit(offset, 'アンカーとエイリアスは整形・変換できません。');
        if (isAlias(node)) return null;
        if (isMap(node) || isSeq(node)) {
            if (depth >= maxDepth) throw new Error(location(offset) + '：入れ子は64段までです。');
            if (isSeq(node)) {
                return { type: 'array', items: node.items.map((item, i) => walk(item, depth + 1, path + '/' + i, offset)) };
            }
            return { type: 'object', entries: node.items.map(({ key, value }, i) => {
                const keyOffset = key?.range?.[0] ?? offset;
                const keyPath = path + '/' + i + 'k';
                if (!isScalar(key) || typeof key.value !== 'string') {
                    limit(keyOffset, 'マップのキーは文字列にしてください。');
                    return { key: { raw: '""' }, node: walk(value, depth + 1, path + '/' + i + 'v', keyOffset) };
                }
                if (key.value === '<<' && key.type === Scalar.PLAIN) limit(keyOffset, '無引用の << キーは整形・変換できません。');
                const keyTree = walk(key, depth + 1, keyPath, keyOffset);
                return { key: keyTree, node: walk(value, depth + 1, path + '/' + i + 'v', keyOffset) };
            }) };
        }
        const value = node?.value ?? null;
        if (typeof value === 'number' || typeof value === 'bigint') {
            const raw = String(value);
            const source = node.source ?? raw;
            if (typeof value === 'bigint' && /^[+-]?0\d+$/.test(source)) {
                limit(offset, '先頭ゼロのある数値です。文字列なら引用し、数値なら先頭ゼロを除いてください。');
            }
            const original = decimal(source) ?? (typeof value === 'bigint' ? decimal(raw) : raw);
            const effective = typeof value === 'number' && Object.is(value, -0) ? '-0' : raw;
            const precise = decimal(effective) === original && effective !== '-0'
                && Number.isFinite(Number(value))
                && (!Number.isInteger(Number(value)) || Number.isSafeInteger(Number(value)));
            if (converting && !precise) limit(offset, '数値を精度を保って変換できません。表記を残す場合は引用してください。');
            signature.push(converting ? [path, original] : [path, original, typeof value]);
            return { type: 'number', raw: effective };
        }
        return { type: value === null ? 'null' : typeof value, raw: JSON.stringify(value) };
    }
    const tree = walk(document.contents, 0, '');
    for (const other of documents.slice(1)) walk(other.contents, 0, '', other.range[0]);
    restrictions.sort((a, b) => a.offset - b.offset);
    const first = restrictions[0];
    return { tree, comments, signature, restriction: first ? location(first.offset) + '：' + first.reason : '' };
}

/**
 * チェック、整形、変換を実行する。
 * @param {{format: 'yaml'|'json', operation: 'check'|'format'|'to-json'|'to-yaml', input: string, indent?: number}} request 入力と選んだ処理。
 * @returns {{message: string, output?: string, suffix?: string}} 表示と保存に使う結果。
 */
export function processYaml({ format, operation, input, indent = 2 }) {
    if (encoder.encode(input).length > INPUT_LIMIT) throw new Error('入力は1 MiBまでです。');
    const source = input.replace(/^\uFEFF/, '');
    if (source.startsWith('\uFEFF')) throw new Error('BOMは先頭に1個までです。');
    if (format === 'json') {
        if (operation !== 'to-yaml') throw new Error('処理を選び直してください。');
        const { warning } = parseJson(source);
        if (warning) throw new Error(warning);
    } else if (format !== 'yaml' || !['check', 'format', 'to-json'].includes(operation)) {
        throw new Error('処理を選び直してください。');
    }

    const parsed = read(source);
    const converting = operation === 'to-json' || operation === 'to-yaml';
    const before = inspect(parsed.documents, parsed.location, converting);
    if (operation === 'check') {
        return { message: ['YAMLの構文は正しいです。', before.restriction].filter(Boolean).join('\n') };
    }
    if (before.restriction) throw new Error(before.restriction);
    if (operation === 'to-json') {
        return { message: 'JSONに変換しました。コメントは引き継がれません。', output: limitOutput(writeJson(before.tree, true) + '\n'), suffix: '.json' };
    }

    const document = parsed.documents[0];
    const output = limitOutput(document.toString({ indent: indent === 4 ? 4 : 2, collectionStyle: format === 'json' ? 'block' : 'any', lineWidth: 0 }));
    const reparsed = read(output);
    const after = inspect(reparsed.documents, reparsed.location, converting);
    if (after.restriction || JSON.stringify([before.tree, before.signature, before.comments])
        !== JSON.stringify([after.tree, after.signature, after.comments])) {
        throw new Error('値・型・コメントを保てることを確認できないため、出力を停止しました。');
    }
    return operation === 'format'
        ? { message: 'YAMLを整形しました。', output, suffix: '-formatted.yaml' }
        : { message: 'YAMLに変換しました。', output, suffix: '.yaml' };
}
