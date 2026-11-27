/** @file URL部品とフォーム値をUTF-8で変換する。 */
const inputLimit = 64 * 1024;
const utf8 = new TextEncoder();

/**
 * @param {string} input 入力欄の文字列。前後の空白と改行も変換対象。
 * @param {'component'|'form'} format URL部品またはフォーム値。
 * @param {boolean} encode エンコードするときはtrue、デコードするときはfalse。
 * @returns {string} UTF-8で変換した文字列。
 * @throws {Error} UTF-8の入力が64 KiBを超えるか、Unicode・%表記・UTF-8バイト列が不正。
 */
export function convertUrlText(input, format, encode) {
    // UTF-8のバイト数はUTF-16コード単位数を下回らない。
    if (input.length > inputLimit || utf8.encode(input).length > inputLimit) {
        throw new Error('UTF-8で64 KiBまで入力できます。');
    }
    // URLSearchParamsは孤立サロゲートを置換するため、変換前に検出する。
    if (/[\uD800-\uDFFF]/u.test(input)) {
        throw new Error('UTF-8に変換できない文字があります。');
    }

    const form = format === 'form';
    if (encode) {
        if (form) return new URLSearchParams({ v: input }).toString().slice(2);
        // encodeURIComponentが残す記号も、URL部品では必要な分だけエスケープする。
        return encodeURIComponent(input).replace(/[!'()*]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase());
    }

    if (/%(?![0-9A-Fa-f]{2})/.test(input)) {
        throw new Error('%の直後には16進数を2桁入力してください。');
    }
    try {
        // フォーム値の裸の+だけを先に空白へ変換し、%2Bはデコード後も+として残す。
        return decodeURIComponent(form ? input.replaceAll('+', ' ') : input);
    } catch {
        throw new Error('正しいUTF-8としてデコードできません。');
    }
}
