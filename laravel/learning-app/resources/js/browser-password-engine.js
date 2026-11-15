/**
 * @file ブラウザー内で生成するパスワードの文字集合・乱数の抽選・条件検証を担当する。
 * DOM操作や保存/送信は行わない。生成値を第三者スクリプトから隔離する機能はない。
 */
// 半角英数の文字集合。記号はASCIIの印字可能文字から英数を除いて作る。
export const LETTER_SETS = Object.freeze({
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
});
export const ALL_SYMBOLS = Array.from({length: 94}, (_, index) => String.fromCharCode(index + 33))
    .filter(character => !/[a-zA-Z0-9]/.test(character)).join('');
export const SYMBOL_PRESETS = Object.freeze({
    all: ALL_SYMBOLS,
    basic: '!@#$%&*+-_',
    minimal: '-_',
});

/**
 * uint32範囲の余り部分を棄却して、指定範囲の添字を選ぶ関数を作る。
 *
 * @param {{getRandomValues: function(Uint32Array): *}} [cryptoSource=globalThis.crypto] ブラウザーの乱数源。テストでは制御した乱数源を渡す。
 * @returns {function(number): number} 要素数size（1〜2^32の整数）を受け、0以上size未満の添字を返す関数。
 * @throws {Error} 乱数源が使えない場合。返した関数も不正なsizeや乱数源の失敗で例外を投げる。
 */
export function createSecureIndex(cryptoSource = globalThis.crypto) {
    if (!cryptoSource?.getRandomValues) throw new Error('このブラウザーでは暗号用途の乱数を利用できません。別のブラウザーで開いてください。');
    const buffer = new Uint32Array(256);
    let position = buffer.length;
    return size => {
        if (!Number.isInteger(size) || size < 1 || size > 2 ** 32) throw new Error('抽選範囲が不正です。');
        // sizeで割り切れる範囲だけ採用し、剰余で一部の添字が多く出る偏りを避ける。
        const limit = Math.floor(2 ** 32 / size) * size;
        let value;
        do {
            if (position === buffer.length) {
                cryptoSource.getRandomValues(buffer);
                position = 0;
            }
            value = buffer[position++];
        } while (value >= limit);
        return value % size;
    };
}

/**
 * 選択した各文字種を含むパスワードを指定件数生成する。
 *
 * @param {Object} options 生成条件。
 * @param {number} options.length 1件の文字数（8〜128の整数、単位：文字）。
 * @param {number} options.count 発行数（1〜100の整数、単位：件）。
 * @param {string[]} options.groups lowercase/uppercase/numbers/symbolsから1つ以上。重複は除く。
 * @param {string} [options.symbolMode="basic"] basic/minimal/all/customの記号指定方式。
 * @param {string} [options.customSymbols=""] custom時に使う半角ASCII記号。英数字/空白は不可。
 * @param {function(number): number} [randomIndex] 候補数に対応する添字を返す関数。省略時は暗号用途の乱数源を使う。
 * @returns {string[]} 条件を満たす生成値の配列。ASCIIだけなので1文字を1として数える。
 * @throws {Error} 条件不正、乱数源の失敗、または1件の生成で10000回候補を試しても条件を満たさない場合。
 */
export function generatePasswords({length, count, groups, symbolMode = 'basic', customSymbols = ''}, randomIndex) {
    if (!Number.isInteger(length) || length < 8 || length > 128) throw new Error('文字数は8〜128の整数で入力してください。');
    if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('発行数は1〜100の整数で入力してください。');
    if (!Array.isArray(groups) || groups.length === 0) throw new Error('文字種を1つ以上選んでください。');
    const selected = [];
    for (const group of new Set(groups)) {
        if (typeof group !== 'string') throw new Error('文字種を選び直してください。');
        if (group === 'symbols') {
            let symbols;
            if (symbolMode === 'custom') {
                if (typeof customSymbols !== 'string' || !/^[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]+$/.test(customSymbols)) throw new Error('利用できる記号には半角ASCII記号を1文字以上入力してください。英数字・空白・全角文字は使えません。');
                symbols = [...new Set(customSymbols)].join('');
            } else {
                symbols = Object.hasOwn(SYMBOL_PRESETS, symbolMode) ? SYMBOL_PRESETS[symbolMode] : null;
                if (!symbols) throw new Error('記号の種類を選び直してください。');
            }
            selected.push(symbols);
        } else if (Object.hasOwn(LETTER_SETS, group)) {
            selected.push(LETTER_SETS[group]);
        } else throw new Error('文字種を選び直してください。');
    }
    const pool = selected.join('');
    const pick = randomIndex ?? createSecureIndex();
    const results = [];
    for (let index = 0; index < count; index++) {
        let accepted = false;
        // 候補全体から選んだ後に必要文字種を検査する。欠けた文字を後付けせず候補を作り直す。
        for (let attempt = 0; attempt < 10000; attempt++) {
            let candidate = '';
            for (let offset = 0; offset < length; offset++) candidate += pool[pick(pool.length)];
            if (selected.every(characters => [...candidate].some(character => characters.includes(character)))) {
                results.push(candidate);
                accepted = true;
                break;
            }
        }
        if (!accepted) throw new Error('生成に失敗しました。条件を確認して再度お試しください。');
    }
    return results;
}
