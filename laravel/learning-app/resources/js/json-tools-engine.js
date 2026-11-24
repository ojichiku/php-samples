/** @file JSONの原文を保持する構文解析と、JSON・JSONL・CSVの出力。 */

export const INPUT_LIMIT = 1024 * 1024;
export const OUTPUT_LIMIT = 5 * INPUT_LIMIT;
const encoder = new TextEncoder();

/** @typedef {{type: string, raw?: string, value?: string, items?: JsonNode[], entries?: {key: JsonNode, node: JsonNode}[]}} JsonNode */

export class JsonToolError extends Error {}

/**
 * @param {string} source 入力原文。
 * @param {number} offset UTF-16位置。
 * @returns {string} 1始まりの行・列。
 */
function location(source, offset) {
    const lines = source.slice(0, offset).split(/\r\n|\r|\n/u);
    return `${lines.length}行目${lines.at(-1).length + 1}列目`;
}

/**
 * JSONの構文を確かめ、文字列・数値の綴り、キー順、重複を保持する。
 * @param {string} input JSON原文。
 * @returns {{root: JsonNode, warning: string}} 構文木と最初の重複警告。
 * @throws {JsonToolError} 構文または入力上限の違反。
 */
export function parseJson(input) {
    if (encoder.encode(input).length > INPUT_LIMIT) throw new JsonToolError('入力は1 MiBまでです。');
    const source = input.replace(/^\uFEFF/u, '');
    const whitespace = /[\x20\t\r\n]*/uy;
    const stringContent = /[^"\\\x00-\x1F]+/uy;
    const scalar = /true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/uy;
    let offset = 0;
    let duplicate = null;
    const fail = (message) => { throw new JsonToolError(`${location(source, offset)}：${message}`); };

    /**
     * @param {RegExp} pattern 現在位置から始まる字句。
     * @returns {string|undefined} 消費した字句。
     */
    function consume(pattern) {
        pattern.lastIndex = offset;
        const match = pattern.exec(source);
        if (!match) return undefined;
        offset = pattern.lastIndex;
        return match[0];
    }

    /** @returns {JsonNode} 原文と復号値を持つ文字列ノード。 */
    function readString() {
        const start = offset;
        offset++;
        while (offset < source.length) {
            consume(stringContent);
            if (source[offset] === '"') {
                const raw = source.slice(start, ++offset);
                return { type: 'string', raw, value: JSON.parse(raw) };
            }
            if (offset === source.length) break;
            if (source.charCodeAt(offset) < 32) fail('文字列にエスケープされていない制御文字があります。');
            offset++; // バックスラッシュを消費してエスケープの種類を調べる。
            if (source[offset] === 'u') {
                for (let digit = 0; digit < 4; digit++) {
                    offset++;
                    if (!/[0-9a-fA-F]/u.test(source[offset] ?? '')) fail('Unicodeエスケープには16進数字が4桁必要です。');
                }
            } else if (!/["\\/bfnrt]/u.test(source[offset] ?? '')) {
                fail('不正なエスケープです。');
            }
            offset++;
        }
        fail('文字列を閉じる二重引用符が必要です。');
    }

    /**
     * @param {number} depth 先祖のコンテナ数。
     * @returns {JsonNode} 値の構文木。
     */
    function readValue(depth) {
        consume(whitespace);
        const first = source[offset];
        if (first === '"') return readString();
        if (first === '{' || first === '[') {
            if (depth >= 64) fail('入れ子は64段までです。');
            offset++;
            consume(whitespace);
            const object = first === '{';
            const end = object ? '}' : ']';
            const entries = [];
            const items = [];
            const keys = new Set();
            if (source[offset] !== end) {
                while (true) {
                    if (object) {
                        if (source[offset] !== '"') fail('項目名を二重引用符で囲んでください。');
                        const position = offset;
                        const key = readString();
                        if (duplicate === null && keys.has(key.value)) duplicate = position;
                        keys.add(key.value);
                        consume(whitespace);
                        if (source[offset] !== ':') fail('項目名の後にコロンが必要です。');
                        offset++;
                        entries.push({ key, node: readValue(depth + 1) });
                    } else {
                        items.push(readValue(depth + 1));
                    }
                    consume(whitespace);
                    if (source[offset] === end) break;
                    if (source[offset] !== ',') fail(`カンマまたは「${end}」が必要です。`);
                    offset++;
                    consume(whitespace);
                }
            }
            offset++;
            return object ? { type: 'object', entries } : { type: 'array', items };
        }
        const raw = consume(scalar);
        if (raw === undefined) fail('JSON値が必要です。');
        const type = raw === 'null' ? 'null' : raw === 'true' || raw === 'false' ? 'boolean' : 'number';
        return { type, raw };
    }

    const root = readValue(0);
    consume(whitespace);
    if (offset !== source.length) fail('JSON値の後に余分な文字があります。');
    return { root, warning: duplicate === null ? '' : `${location(source, duplicate)}に重複したキーがあります。` };
}

/**
 * JSONの字句を保ちながら整形または圧縮する。
 * @param {JsonNode} root 構文木。
 * @param {boolean} pretty 改行と字下げを加えるか。
 * @param {string} indent 1階層分の字下げ文字列。
 * @returns {string} JSONテキスト。
 * @throws {JsonToolError} 出力上限超過。
 */
export function writeJson(root, pretty, indent = '  ') {
    const chunks = [];
    let length = 0;
    /**
     * @param {string} chunk 出力断片。
     * @returns {void}
     */
    function append(chunk) {
        length += chunk.length;
        if (length > OUTPUT_LIMIT) throw new JsonToolError('出力は5 MiBまでです。');
        chunks.push(chunk);
    }
    /**
     * @param {JsonNode} node 部分木。
     * @param {number} depth 入れ子段数。
     * @returns {void}
     */
    function write(node, depth) {
        if (node.raw !== undefined) {
            append(node.raw);
            return;
        }
        const object = node.type === 'object';
        append(object ? '{' : '[');
        const children = object ? node.entries : node.items;
        children.forEach((child, index) => {
            if (index) append(',');
            if (pretty) append('\n' + indent.repeat(depth + 1));
            if (object) append(child.key.raw + (pretty ? ': ' : ':'));
            write(object ? child.node : child, depth + 1);
        });
        if (pretty && children.length) append('\n' + indent.repeat(depth));
        append(object ? '}' : ']');
    }
    write(root, 0);
    return limitOutput(chunks.join(''));
}

/**
 * @param {string} result 出力テキスト。
 * @returns {string} バイト上限内の出力。
 * @throws {JsonToolError} 5 MiB超過。
 */
export function limitOutput(result) {
    if (encoder.encode(result).length > OUTPUT_LIMIT) throw new JsonToolError('出力は5 MiBまでです。');
    return result;
}

/**
 * JSONLを1行1値に保ち、LFと末尾改行を付ける。
 * @param {string} input JSONL原文。
 * @returns {{output: string, warning: string}} 整形結果。
 * @throws {JsonToolError} 不正な行、BOM、入力上限の違反。
 */
export function formatJsonl(input) {
    if (encoder.encode(input).length > INPUT_LIMIT) throw new JsonToolError('入力は1 MiBまでです。');
    const lines = input.replace(/\r?\n$/u, '').split(/\r?\n/u);
    let warning = '';
    const result = lines.map((line, index) => {
        if (line.startsWith('\uFEFF')) throw new JsonToolError(`${index + 1}行目1列目：JSONLでBOMは使用できません。`);
        try {
            const document = parseJson(line);
            if (!warning && document.warning) warning = document.warning.replace(/^1行目/u, `${index + 1}行目`);
            return writeJson(document.root, false);
        } catch (error) {
            if (!(error instanceof JsonToolError)) throw error;
            throw new JsonToolError(error.message.replace(/^1行目/u, `${index + 1}行目`));
        }
    });
    return { output: limitOutput(result.join('\n') + '\n'), warning };
}

/**
 * @param {JsonNode} node セルになる原始値。
 * @param {string} position 表内の位置。
 * @returns {string} エスケープ済みセル。
 */
function csvCell(node, position) {
    if (!['string', 'number', 'boolean'].includes(node.type)) {
        throw new JsonToolError(`${position}：CSVに変換できる値は文字列・数値・真偽値です。`);
    }
    const value = node.type === 'string' ? node.value : node.raw;
    if (node.type === 'string' && (/^[\t\r\n]|^\s*[=+@-]/u.test(value) || /[\uD800-\uDFFF]/u.test(value))) {
        throw new JsonToolError(`${position}：表計算で式と解釈される可能性のある文字列、または単独サロゲートを含みます。`);
    }
    return '"' + value.replaceAll('"', '""') + '"';
}

/**
 * 平坦な配列を最初の要素のキー順でCSVに変換する。
 * @param {JsonNode} root JSONの構文木。
 * @returns {{output: string, preview: string[][], rowCount: number}} CRLFのCSVと先頭100行の表示用データ。
 * @throws {JsonToolError} 表として扱えない形や値、または出力上限の違反。
 */
export function convertJsonToCsv(root) {
    if (root.type !== 'array' || !root.items.length) throw new JsonToolError('空でない配列を入力してください。');
    if (root.items.length > 5000) throw new JsonToolError('CSVは5,000データ行までです。');
    const first = root.items[0];
    if (first.type !== 'object' || !first.entries.length) throw new JsonToolError('1件目は空でないオブジェクトにしてください。');
    if (first.entries.length > 100) throw new JsonToolError('CSVは100列までです。');
    const keys = first.entries.map(({ key }) => key.value);
    const keySet = new Set(keys);
    const preview = [keys];
    const rows = [first.entries.map(({ key }, index) => csvCell(key, `見出し${index + 1}列目`)).join(',')];
    root.items.forEach((row, index) => {
        const position = `${index + 1}件目`;
        if (row.type !== 'object') throw new JsonToolError(`${position}はオブジェクトにしてください。`);
        const values = new Map(row.entries.map(({ key, node }) => [key.value, node]));
        for (const key of values.keys()) {
            if (!keySet.has(key)) throw new JsonToolError(`${position}：先頭行にないキー ${JSON.stringify(key)} があります。`);
        }
        const cells = keys.map((key) => {
            if (!values.has(key)) throw new JsonToolError(`${position}：キー ${JSON.stringify(key)} がありません。`);
            return values.get(key);
        });
        if (index < 100) preview.push(cells.map(cell => cell.value ?? cell.raw));
        rows.push(cells.map((cell, column) => {
            const key = keys[column];
            return csvCell(cell, `${position}のキー ${JSON.stringify(key)}`);
        }).join(','));
    });
    return { output: limitOutput(rows.join('\r\n') + '\r\n'), preview, rowCount: root.items.length };
}
