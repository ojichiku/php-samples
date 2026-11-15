/**
 * @file テキスト整形/変換/置換/正規表現の計算処理。Workerから呼び、DOM操作や通信はしない。
 * 入力の改行はLFへそろえる。上限の文字数は見た目の文字数でなくUnicodeコードポイント数。
 */
/**
 * @typedef {Object} TextOptions
 * @property {string} tool edit/build/generate/format/lines/replace/convert/matchの処理キー。
 * @property {string} [text] 入力テキスト。通常10万コードポイント以内。
 * @property {string} [pattern] 正規表現（区切りの/なし、1000コードポイント以内）。
 * @property {string} [flags="u"] 正規表現フラグ。i/m/s/uの重複なし。gは内部で付ける。
 * @property {string} [operation] 単独処理の方式：trim/blank/collapse/unique/asc/desc/upper/lower/half/full。
 * @property {string[]} [targets] 文字幅変換対象のletters/numbers/symbols/space。
 * @property {string} [mode] replace/convertでregexなら正規表現、それ以外は全体/文字列処理。
 * @property {string} [search] 文字列検索語（1〜1000コードポイント）。
 * @property {string} [replacement] 置換語（1000コードポイント以内、空なら削除）。
 * @property {string} [width] editでhalf/full/none。文字幅変換を先に行う。
 * @property {string} [letterCase] editでupper/lower/none。文字幅変換の次に行う。
 * @property {string} [scope] editでregexなら文字変換を一致部分に絞る。
 * @property {boolean} [replaceEnabled] editで置換ルールを適用するか。
 * @property {Array<{mode: string, search: string, replacement: string}>} [rules] editの順序付き置換ルール（1〜20件）。
 * @property {boolean} [trim] editで各行の前後空白を除去するか。
 * @property {string} [blank] editの空行処理（blankは削除、collapseは連続空行を1行へ）。
 * @property {boolean} [unique] editで完全一致の重複行を削除するか。
 * @property {string} [sort] editの行順（asc/desc、それ以外は変更しない）。
 * @property {string} [buildMode] buildでgeneralなら英数を種類と長さへ一般化し、それ以外は完全一致。
 * @property {string} [positive] buildの一致してほしい検証例（1行1件、全体1000コードポイント以内）。
 * @property {string} [negative] buildの一致してほしくない検証例（同上）。
 * @property {number|string} [amount] generateの要求件数（数値化後1〜10の整数）。
 */
/**
 * @typedef {Object} MatchRecord
 * @property {string} value 一致した文字列。空文字一致も含む。
 * @property {number} index UTF-16コード単位での開始位置（0始まり）。
 * @property {number} row 行番号（1始まり）。
 * @property {number} column コードポイント単位の列番号（1始まり）。
 * @property {Array<string|null>} captures 番号付きキャプチャ。未一致はnull。
 * @property {Object<string, (string|undefined)>|null} groups 名前付きキャプチャ。グループ定義がなければnull。
 */
/**
 * @typedef {Object} TextResult
 * @property {string} output 表示/コピー用の結果。通常の変換は最大100万コードポイント。
 * @property {number} [count] 一致件数または生成件数。処理によって省略する。
 * @property {number} [changed] 一致部分のうち文字列が変わった件数。
 * @property {string} [text] matchで使用した改行正規化後の入力。
 * @property {MatchRecord[]} [matches] matchの先頭1000件までの一致情報。
 * @property {boolean} [truncated] 1000件を超え、以降を確認していないか。
 * @property {Array<{expected: boolean, passed: boolean}>} [checks] buildの検証例ごとの期待と判定。
 * @property {string[]} [samples] generateの重複を除いた生成例。
 * @property {number} [requested] generateの要求件数。有限候補/試行上限によりcountがこれより少ない場合がある。
 */
import { generateSamples } from './text-tools-samples.js';

// 入力/出力の上限（単位：Unicodeコードポイント、改行を含む）。
export const INPUT_LIMIT = 100_000;
export const OUTPUT_LIMIT = 1_000_000;
/**
 * null/undefinedを空とし、CRLF/CRをLFへそろえる。
 *
 * @param {*} value 文字列へ変換する入力。
 * @returns {string} LF改行の文字列。
 */
const normalize = value => String(value ?? '').replace(/\r\n?/g, '\n');
/**
 * 文字列のコードポイント数を数える。
 *
 * @param {string} value 数える文字列。
 * @returns {number} 改行を含むコードポイント数。見た目の文字数とは異なる。
 */
export const codepoints = value => Array.from(value).length;
/**
 * 結果上限を検査し、切り捨てず元の値を返す。
 *
 * @param {string} value 検査する出力。
 * @returns {string} 上限内の出力。
 * @throws {Error} 出力が100万コードポイントを超える場合。
 */
function bounded(value) {
    if (value.length > OUTPUT_LIMIT * 2 || codepoints(value) > OUTPUT_LIMIT) throw new Error('結果が100万文字を超えるため中止しました。');
    return value;
}
/**
 * 書記素単位の文字数と論理行数を計測する。
 *
 * @param {string} value 改行正規化前の入力。
 * @returns {{characters: number, withoutSpaces: number, lines: number}} 改行を除く書記素数、空白/タブ/改行を除く書記素数、行数。空文字は0行。
 * @throws {Error} 10万コードポイント超、またはIntl.Segmenterが使えない場合。
 */
export function countText(value) {
    const text = normalize(value);
    if (codepoints(text) > INPUT_LIMIT) throw new Error('入力は10万文字以内にしてください。');
    if (typeof Intl.Segmenter !== 'function') throw new Error('このブラウザーは書記素単位の文字数計測に対応していません。');
    const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
    /**
     * Intl.Segmenterの列挙を数えて書記素数を返す。
     *
     * @param {string} s 計測する文字列。
     * @returns {number} 書記素の数。
     */
    const count = s => { let n = 0; for (const _ of segmenter.segment(s)) n++; return n; };
    return { characters: count(text.replace(/\n/g, '')), withoutSpaces: count(text.replace(/[ \u3000\t\n]/g, '')), lines: text === '' ? 0 : text.split('\n').length };
}
/**
 * 検証したフラグへgを付けて検索用の正規表現を作る。
 *
 * @param {string} pattern 正規表現本体（1〜1000コードポイント）。
 * @param {string} flags i/m/s/uの重複のない組合せ。
 * @returns {RegExp} 全一致を検索できる正規表現。
 * @throws {Error} 本体/フラグ/構文が不正の場合。
 */
function compile(pattern, flags) {
    if (!pattern) throw new Error('正規表現を入力してください。');
    if (codepoints(pattern) > 1000) throw new Error('正規表現は1,000文字以内にしてください。');
    if (!/^(?!.*(.).*\1)[imsu]*$/.test(flags)) throw new Error('正規表現のフラグが不正です。');
    try { return new RegExp(pattern, flags + 'g'); } catch { throw new Error('正規表現の構文を確認してください。'); }
}
/**
 * 全一致を列挙し、空文字一致でも検索位置を進める。
 *
 * @param {RegExp} regex g付き正規表現。lastIndexを更新する。
 * @param {string} text 検索対象。
 * @returns {Generator<RegExpExecArray, void, unknown>} 一致配列の列挙。indexはUTF-16位置。
 */
function* matches(regex, text) {
    let match;
    while ((match = regex.exec(text)) !== null) {
        yield match;
        // 空文字一致のexecは位置を進めないため、Unicodeモードではサロゲートペアの幅も考慮する。
        if (match[0] === '') {
            const cp = text.codePointAt(regex.lastIndex);
            regex.lastIndex += regex.unicode && cp > 0xffff ? 2 : 1;
        }
    }
}
/**
 * 英字の大小または対象文字だけの全角/半角を変換する。
 *
 * @param {string} value 変換対象の文字列。
 * @param {TextOptions} options operationとtargetsを使う変換条件。カナは対象外。
 * @returns {string} 変換後の文字列。
 * @throws {Error} 方式が不正、または幅変換の対象が未選択の場合。
 */
function convert(value, options) {
    if (options.operation === 'upper') return value.replace(/[a-z]/g, c => c.toUpperCase());
    if (options.operation === 'lower') return value.replace(/[A-Z]/g, c => c.toLowerCase());
    if (!['half', 'full'].includes(options.operation)) throw new Error('変換方法を選んでください。');
    if (!options.targets?.length) throw new Error('変換対象を選んでください。');
    return Array.from(value, character => {
        let point = character.codePointAt(0);
        const ascii = point === 0x3000 ? 32 : point >= 0xff01 && point <= 0xff5e ? point - 0xfee0 : point;
        const group = ascii === 32 ? 'space' : /[A-Za-z]/.test(String.fromCodePoint(ascii)) ? 'letters' : ascii >= 48 && ascii <= 57 ? 'numbers' : ascii >= 33 && ascii <= 126 ? 'symbols' : null;
        if (!group || !options.targets.includes(group)) return character;
        if (options.operation === 'half') return String.fromCodePoint(ascii);
        return String.fromCodePoint(ascii === 32 ? 0x3000 : ascii + 0xfee0);
    }).join('');
}
/**
 * JavaScriptの置換参照を一致情報から展開する。
 *
 * @param {string} template $1/$&/名前付き参照などを含む置換テンプレート。
 * @param {RegExpExecArray} match 展開対象の一致情報。
 * @param {string} text 参照元の全文。前後部分の参照に使う。
 * @returns {string} キャプチャや前後文脈を展開した置換文字列。
 */
function replacementValue(template, match, text) {
    return template.replace(/\$(\$|&|`|'|\d{1,2}|<[^>]*>)/g, (token, key) => {
        if (key === '$') return '$';
        if (key === '&') return match[0];
        if (key === '`') return text.slice(0, match.index);
        if (key === "'") return text.slice(match.index + match[0].length);
        if (key.startsWith('<')) return match.groups ? (match.groups[key.slice(1, -1)] ?? '') : token;
        const n = Number(key);
        if (n > 0 && n < match.length) return match[n] ?? '';
        if (key.length === 2 && Number(key[0]) > 0 && Number(key[0]) < match.length) return (match[Number(key[0])] ?? '') + key[1];
        return token;
    });
}
/**
 * 一致部分を順に変換し、出力上限を確認しながら結合する。
 *
 * @param {string} text 元の全文。
 * @param {RegExp} regex g付きの検索式。
 * @param {function(RegExpExecArray): string} callback 一致ごとの置換文字列を返す処理。
 * @returns {{output: string, count: number, changed: number}} 結合結果、一致件数、実際に変わった件数。
 * @throws {Error} 結合結果が100万コードポイントを超える場合。
 */
function transformMatches(text, regex, callback) {
    let previous = 0, count = 0, changed = 0, output = '', length = 0;
    /**
     * 結果の累計コードポイント数を検査してから文字列を追加する。
     *
     * @param {string} chunk 追加する部分。
     * @returns {void}
     * @throws {Error} 出力上限超過の場合。
     */
    const append = chunk => {
        length += codepoints(chunk);
        if (length > OUTPUT_LIMIT) throw new Error('結果が100万文字を超えるため中止しました。');
        output += chunk;
    };
    for (const match of matches(regex, text)) {
        append(text.slice(previous, match.index));
        const replacement = callback(match);
        append(replacement);
        count++; if (replacement !== match[0]) changed++;
        previous = match.index + match[0].length;
    }
    append(text.slice(previous));
    return { output, count, changed };
}
/**
 * ロケール順ではなくUnicodeコードポイント順で行を比較する。
 *
 * @param {string} a 左の行。
 * @param {string} b 右の行。
 * @returns {number} aが前なら負、同じなら0、後なら正。
 */
const compareLines = (a, b) => {
    const x = Array.from(a, c => c.codePointAt(0)), y = Array.from(b, c => c.codePointAt(0));
    for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
    return x.length - y.length;
};
/**
 * 指定された用途へ振り分け、入力を保持したまま処理結果を返す。
 *
 * @param {TextOptions} options 用途別の入力と設定。
 * @returns {TextResult} 用途に対応した出力と、一致/検証/生成に必要な追加情報。
 * @throws {Error} 入力上限・不正条件・未対応の処理・正規表現の失敗など。時間制限は呼出し側のWorker停止で行う。
 */
export function processText(options) {
    const text = normalize(options.text), pattern = normalize(options.pattern), flags = options.flags ?? 'u';
    if (codepoints(text) > INPUT_LIMIT) throw new Error('入力は10万文字以内にしてください。');
    if (options.tool === 'generate') {
        compile(pattern, flags);
        return generateSamples(pattern, flags, Number(options.amount));
    }
    if (options.tool === 'edit') return editText(text, options);
    if (options.tool === 'build') return buildPattern(text, options);
    if (options.tool !== 'match' && text === '') throw new Error('文章を入力してください。');
    if (options.tool === 'format') {
        let lines = text.split('\n');
        if (options.operation === 'trim') lines = lines.map(line => line.replace(/^[ \t\u3000]+|[ \t\u3000]+$/g, ''));
        else if (options.operation === 'blank') lines = lines.filter(line => !/^[ \t\u3000]*$/.test(line));
        else if (options.operation === 'collapse') {
            const collapsed = []; let blank = false;
            for (const line of lines) { const empty = /^[ \t\u3000]*$/.test(line); if (!empty || !blank) collapsed.push(empty ? '' : line); blank = empty; }
            lines = collapsed;
        } else throw new Error('整形方法を選んでください。');
        return { output: lines.join('\n') };
    }
    if (options.tool === 'lines') {
        let lines = text.split('\n');
        if (options.operation === 'unique') lines = [...new Set(lines)];
        else if (['asc', 'desc'].includes(options.operation)) { lines.sort(compareLines); if (options.operation === 'desc') lines.reverse(); }
        else throw new Error('行の整理方法を選んでください。');
        return { output: lines.join('\n') };
    }
    if (options.tool === 'replace') {
        const replacement = normalize(options.replacement);
        if (codepoints(replacement) > 1000) throw new Error('置換語は1,000文字以内にしてください。');
        if (options.mode === 'regex') return transformMatches(text, compile(pattern, flags), match => replacementValue(replacement, match, text));
        const search = normalize(options.search);
        if (!search || codepoints(search) > 1000) throw new Error('検索語は1〜1,000文字で入力してください。');
        const pieces = text.split(search);
        const size = codepoints(text) + (pieces.length - 1) * (codepoints(replacement) - codepoints(search));
        if (size > OUTPUT_LIMIT) throw new Error('結果が100万文字を超えるため中止しました。');
        return { output: bounded(pieces.join(replacement)), count: pieces.length - 1 };
    }
    if (options.tool === 'convert') {
        if (options.mode !== 'regex') return { output: convert(text, options) };
        return transformMatches(text, compile(pattern, flags), match => match[0] === '' ? '' : convert(match[0], options));
    }
    if (options.tool === 'match') {
        const found = []; let truncated = false;
        let positionIndex = 0, row = 1, column = 1;
        for (const match of matches(compile(pattern, flags), text)) {
            if (found.length === 1000) { truncated = true; break; }
            while (positionIndex < match.index) {
                const point = text.codePointAt(positionIndex), size = point > 0xffff ? 2 : 1;
                if (positionIndex + size > match.index) break;
                if (point === 10) { row++; column = 1; } else column++;
                positionIndex += size;
            }
            found.push({ value: match[0], index: match.index, row, column, captures: match.slice(1).map(value => value ?? null), groups: match.groups ?? null });
        }
        return { text, matches: found, truncated, count: found.length, output: found.map(match => match.value === '' ? '（空文字）' : match.value).join('\n') };
    }
    throw new Error('ツールを選んでください。');
}

/**
 * 幅→大小文字→ルール順の置換→空白/空行→重複→行順で選択処理を適用する。
 *
 * @param {string} text LF正規化後の空でない元入力。
 * @param {TextOptions} options edit用の選択設定。
 * @returns {{output: string}} 組合せ処理後のテキスト。
 * @throws {Error} 条件が不正、置換ルール超過、正規表現が不正、または出力超過の場合。
 */
function editText(text, options) {
    if (!text) throw new Error('文章を入力してください。');
    let value = text;
    for (const operation of [options.width, options.letterCase]) {
        if (!operation || operation === 'none') continue;
        value = processText({ tool: 'convert', text: value, operation, targets: options.targets,
            mode: options.scope, pattern: options.pattern, flags: 'u' }).output;
    }
    if (options.replaceEnabled) {
        if (!options.rules?.length || options.rules.length > 20) throw new Error('置換ルールは1〜20件にしてください。');
        for (const rule of options.rules) {
            // 途中で全文が削除されても、後続ルールの入力検証は省略しない。
            const replacement = normalize(rule.replacement), search = normalize(rule.search);
            if (codepoints(replacement) > 1000) throw new Error('置換語は1,000文字以内にしてください。');
            if (rule.mode === 'regex') value = transformMatches(value, compile(search, 'u'), match => replacementValue(replacement, match, value)).output;
            else {
                if (!search || codepoints(search) > 1000) throw new Error('検索語は1〜1,000文字で入力してください。');
                const pieces = value.split(search);
                if (codepoints(value) + (pieces.length - 1) * (codepoints(replacement) - codepoints(search)) > OUTPUT_LIMIT) throw new Error('結果が100万文字を超えるため中止しました。');
                value = bounded(pieces.join(replacement));
            }
        }
    }
    let lines = value.split('\n');
    if (options.trim) lines = lines.map(line => line.replace(/^[ \t\u3000]+|[ \t\u3000]+$/g, ''));
    if (options.blank === 'blank') lines = lines.filter(line => !/^[ \t\u3000]*$/.test(line));
    if (options.blank === 'collapse') {
        let previousBlank = false;
        lines = lines.filter(line => { const blank = /^[ \t\u3000]*$/.test(line); const keep = !blank || !previousBlank; previousBlank = blank; return keep; }).map(line => /^[ \t\u3000]*$/.test(line) ? '' : line);
    }
    if (options.unique) lines = [...new Set(lines)];
    if (['asc', 'desc'].includes(options.sort)) {
        lines.sort(compareLines);
        if (options.sort === 'desc') lines.reverse();
    }
    return { output: bounded(lines.join('\n')) };
}
/**
 * 入力例から完全一致の正規表現候補を作り、任意の正例/負例で確認する。
 *
 * @param {string} text 元の入力例（1〜1000コードポイント）。
 * @param {TextOptions} options buildModeとpositive/negativeを使う条件。
 * @returns {{output: string, checks: Array<{expected: boolean, passed: boolean}>}} 候補と各例の期待に対する判定。意図の正しさを自動保証するものではない。
 * @throws {Error} 入力/検証例が範囲外、または生成した正規表現が不正の場合。
 */
function buildPattern(text, options) {
    if (!text || codepoints(text) > 1000) throw new Error('元になる入力例は1〜1,000文字で入力してください。');
    /**
     * 入力例を正規表現で文字どおり照合できる形へエスケープする。
     *
     * @param {string} value 入力例または一般化対象外の部分。
     * @returns {string} 特殊文字/改行/タブをエスケープした文字列。
     */
    const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
    let body = escape(text);
    if (options.buildMode === 'general') body = (text.match(/[A-Z]+|[a-z]+|[0-9]+|[^A-Za-z0-9]+/g) ?? []).map(part => {
        const type = /^[A-Z]+$/.test(part) ? '[A-Z]' : /^[a-z]+$/.test(part) ? '[a-z]' : /^[0-9]+$/.test(part) ? '[0-9]' : null;
        return type ? type + '{' + part.length + '}' : escape(part);
    }).join('');
    const output = '^(?:' + body + ')(?![\\s\\S])';
    const regex = compile(output, 'u');
    const checks = [];
    for (const [key, expected] of [['positive', true], ['negative', false]]) {
        const examples = normalize(options[key]);
        if (codepoints(examples) > 1000) throw new Error('検証例は各1,000文字以内にしてください。');
        for (const example of examples.split('\n').filter(value => value !== '')) {
            regex.lastIndex = 0;
            checks.push({ expected, passed: regex.test(example) === expected });
        }
    }
    return { output, checks };
}
