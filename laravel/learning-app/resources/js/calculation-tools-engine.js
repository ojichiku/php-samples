/** @file 日常計算の10進入力検証と整数比の表示。DOM・通信・保存には依存しない。 */
/** @typedef {{n: bigint, d: bigint, text: string}} DecimalValue 10進入力の整数分子、正の分母、正規化文字列。 */
/**
 * 入力の形式・上限を検査し、丸めずに整数比へ変換する。
 * @param {string} raw 入力欄の未検証文字列。
 * @param {string} id 入力欄のID。
 * @param {string} label エラーで使う項目名。
 * @param {number} digits 許容する小数桁数。
 * @param {bigint} max 許容する整数上限。
 * @param {boolean} positive 0を禁止する場合true。
 * @returns {DecimalValue} 検証済みの値。
 * @throws {Error} 空欄、負数、書式/桁数/上限違反、禁止された0の場合。inputIdで該当欄を示す。
 */
export function parseDecimal(raw, id, label, digits = 4, max = 999999999n, positive = false) {
    const text = raw.normalize('NFKC').trim();
    const maximumText = `${max.toLocaleString('ja-JP')}${max === 999999999n && digits ? `.${'9'.repeat(digits)}` : ''}`;
    let reason = '';
    if (!text) reason = `${label}を入力してください。`;
    else if (!/^\d+(?:\.\d+)?$/.test(text)) reason = `${label}は0以上の数字で入力してください。桁区切り・指数表記は使えません。`;
    const [whole = '', fraction = ''] = text.split('.');
    if (!reason && fraction.length > digits) reason = digits ? `${label}の小数は${digits}桁までです。` : `${label}は整数で入力してください。`;
    // 巨大な文字列からBigIntを作る前に入力長を制限する。
    if (!reason && (whole.length > 9 || text.length > 16)) reason = `${label}は${maximumText}以下で入力してください。`;
    if (reason) throw Object.assign(new Error(reason), { inputId: id });
    const d = 10n ** BigInt(fraction.length), n = BigInt(whole) * d + BigInt(fraction || '0');
    if (n > max * d + (max === 999999999n && digits ? d - 1n : 0n)) reason = `${label}は${maximumText}以下で入力してください。`;
    if (positive && n === 0n) reason = `${label}は0より大きい値にしてください。${id === 'split-people' ? '人数は1人以上です。' : '0を基準にした割合は計算できません。'}`;
    if (reason) throw Object.assign(new Error(reason), { inputId: id });
    return { n, d, text };
}
/**
 * 正の整数比を小数4桁で四捨五入し、丸めがあれば約を付ける。
 * @param {bigint} n 0以上の分子。
 * @param {bigint} d 正の分母。
 * @returns {string} 桁区切り、不要な末尾0の省略を施した表示値。
 */
export function rounded(n, d) {
    const scaled = n * 10000n, value = (scaled * 2n + d) / (2n * d);
    const decimal = (value % 10000n).toString().padStart(4, '0').replace(/0+$/, '');
    return `${scaled % d ? '約' : ''}${(value / 10000n).toLocaleString('ja-JP')}${decimal ? `.${decimal}` : ''}`;
}
