/** @file HEXとRGBの色コードを検証し、同じ色を両方の形式で返す。 */

/**
 * @param {string} input 色コード1件。前後の空白を含めて最大64 Unicodeコードポイント。
 * @returns {{hex: string, rgb: string}|null} 大文字6桁のHEXとカンマ区切りのRGB。空欄はnull。
 * @throws {Error} 文字数の上限、書式、またはRGB各成分の範囲に違反している。
 */
export function convertColorCode(input) {
    if (!/^.{0,64}$/su.test(input)) {
        throw new Error('色コードは空白を含めて64文字まで入力できます。');
    }

    const value = input.trim();
    if (value === '') return null;

    const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
    let channels;
    if (hexMatch) {
        const digits = hexMatch[1];
        // 3桁のHEXは各桁を2回繰り返して、6桁と同じ方法で各成分を読む。
        const pairs = digits.length === 3 ? digits.replace(/[0-9a-f]/gi, digit => digit.repeat(2)) : digits;
        channels = [0, 2, 4].map(start => Number.parseInt(pairs.slice(start, start + 2), 16));
    } else {
        const rgbMatch = /^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/i.exec(value);
        if (!rgbMatch) throw new Error('#RGB、#RRGGBB、rgb(0, 0, 0) のいずれかの形式で入力してください。');

        channels = rgbMatch.slice(1).map(Number);
        if (channels.some(channel => channel > 255)) {
            throw new Error('RGBの各値は0〜255で入力してください。');
        }
    }

    const hex = channels.map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase();
    return { hex: `#${hex}`, rgb: `rgb(${channels.join(', ')})` };
}
