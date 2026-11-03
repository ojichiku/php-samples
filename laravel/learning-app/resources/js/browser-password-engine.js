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

/** Uniformly select an index, rejecting the incomplete tail of the uint32 range. */
export function createSecureIndex(cryptoSource = globalThis.crypto) {
    if (!cryptoSource?.getRandomValues) throw new Error('このブラウザーでは暗号用途の乱数を利用できません。別のブラウザーで開いてください。');
    const buffer = new Uint32Array(256);
    let position = buffer.length;
    return size => {
        if (!Number.isInteger(size) || size < 1 || size > 2 ** 32) throw new Error('抽選範囲が不正です。');
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
