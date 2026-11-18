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

/** @typedef {{price: bigint, amount: DecimalValue, multiplier: bigint}} Product 円の整数価格、正の内容量、基準単位への倍率。 */

/**
 * 2商品の単価を比較し、円を小数2桁で表示する。
 * @param {Product} a 商品A。
 * @param {Product} b 商品B。
 * @param {bigint} scale 比較基準量。g・mLは100、個は1。
 * @returns {{order: bigint, a: string, b: string, difference: string, sameDisplay: boolean}} 厳密な差の符号と表示用の金額。
 */
export function compareUnitPrices(a, b, scale) {
    const numeratorA = a.price * a.amount.d * scale;
    const numeratorB = b.price * b.amount.d * scale;
    const denominatorA = a.amount.n * a.multiplier;
    const denominatorB = b.amount.n * b.multiplier;
    // 表示用の丸めより先に交差乗算して割安な商品を判定する。
    const order = numeratorA * denominatorB - numeratorB * denominatorA;
    const difference = order < 0n ? -order : order;
    const denominator = denominatorA * denominatorB;
    const displayA = unitPriceYen(numeratorA, denominatorA);
    const displayB = unitPriceYen(numeratorB, denominatorB);
    return {
        order,
        a: displayA,
        b: displayB,
        difference: difference > 0n && difference * 100n < denominator ? '0.01円未満' : unitPriceYen(difference, denominator),
        sameDisplay: displayA.replace('約', '') === displayB.replace('約', ''),
    };
}

/**
 * 円の整数比を小数第2位まで四捨五入する。
 * @param {bigint} numerator 0以上の分子。
 * @param {bigint} denominator 正の分母。
 * @returns {string} 円単位の表示。丸めた場合は「約」を付ける。
 */
function unitPriceYen(numerator, denominator) {
    const scaled = numerator * 100n;
    const cents = (scaled * 2n + denominator) / (2n * denominator);
    const fraction = String(cents % 100n).padStart(2, '0');
    return `${scaled % denominator ? '約' : ''}${(cents / 100n).toLocaleString('ja-JP')}.${fraction}円`;
}

/**
 * 指定した支払い単位で基本額を切り下げ、残額を1人の基本額に加える。
 * @param {bigint} total 合計金額（円）。
 * @param {bigint} people 残額の負担者を含む正の人数。
 * @param {bigint} unit 正の支払い単位（円）。
 * @returns {{each: bigint, rest: bigint, last: bigint}} 基本額、残額、残額を引き受ける1人の支払額（円）。
 */
export function splitByUnit(total, people, unit) {
    const each = total / (people * unit) * unit;
    const rest = total - each * people;
    return { each, rest, last: each + rest };
}
