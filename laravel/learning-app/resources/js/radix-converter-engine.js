/** @file 整数の桁を読み取り、別の基数へ変換する。 */
const digitLimit = 1024;
const radixError = '基数は2〜36の整数で入力してください。';

/**
 * @param {number} base 入力または出力に使う基数。
 * @returns {void}
 * @throws {RangeError} 基数が2〜36の整数でない場合。
 */
function requireRadix(base) {
    if (!Number.isInteger(base) || base < 2 || base > 36) {
        throw new RangeError(radixError);
    }
}

/**
 * @param {string} input 基数欄の文字列。前後の空白を除き、半角数字で表した2〜36の整数。
 * @returns {number|null} 有効な基数。空欄のときはnull。
 * @throws {RangeError} 基数の書式が不正または範囲外の場合。
 */
export function parseRadix(input) {
    const text = input.trim();
    if (text === '') return null;
    if (!/^[0-9]+$/.test(text)) throw new RangeError(radixError);
    const base = Number(text);
    requireRadix(base);
    return base;
}

/**
 * @param {string} input 変換する整数。前後の空白と先頭の半角符号を許容する。
 * @param {number} fromBase 入力の基数。2〜36の整数。
 * @param {number} toBase 出力の基数。2〜36の整数。
 * @returns {string} 大文字の英数字と必要に応じた負号で表した変換結果。空欄のときは空文字。
 * @throws {RangeError} 基数、整数の書式、桁数、または指定基数の桁が不正な場合。
 */
export function convertRadixInteger(input, fromBase, toBase) {
    requireRadix(fromBase);
    requireRadix(toBase);
    const text = input.trim();
    if (text === '') return '';

    const match = /^([+-]?)([0-9a-z]+)$/i.exec(text);
    if (match === null) throw new RangeError('整数は半角の英数字と先頭の符号で入力してください。');
    const [, sign, digits] = match;
    if (digits.length > digitLimit) throw new RangeError(`整数は${digitLimit}桁まで入力できます。`);

    // 指定基数で左から1桁ずつ積み上げ、Numberでは保持できない整数も正確に変換する。
    const base = BigInt(fromBase);
    let magnitude = 0n;
    for (const character of digits.toUpperCase()) {
        const digit = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(character);
        if (digit >= fromBase) throw new RangeError(`${fromBase}進数では「${character}」を使えません。`);
        magnitude = magnitude * base + BigInt(digit);
    }
    const number = sign === '-' ? -magnitude : magnitude;
    return number.toString(toBase).toUpperCase();
}
