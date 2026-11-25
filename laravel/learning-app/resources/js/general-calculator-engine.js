/** @file 一般電卓の式を解析し、値と表示用の丸めを分けて計算する。 */

export const EXPRESSION_LIMIT = 256;
const MAX_VALUE = 1_000_000_000_000n;
const MAX_FRACTION_DIGITS = 4096;
const FUNCTIONS = ['sqrt', 'abs', 'sin', 'cos', 'tan', 'log', 'ln'];
const NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

/** @typedef {{n: bigint, d: bigint, approximate: boolean}} Fraction 分母が正の既約分数と近似フラグ。 */

/** @param {bigint} value 符号付き整数。 @returns {bigint} 絶対値。 */
const abs = (value) => value < 0n ? -value : value;

/**
 * 分母の符号をそろえ、既約分数にする。
 * @param {bigint} n 分子。
 * @param {bigint} [d] 分母。
 * @param {boolean} [approximate] 既に近似を含む場合はtrue。
 * @returns {Fraction} 正の分母を持つ分数。
 * @throws {RangeError} 分母が0、または保持できる桁数を超えたとき。
 */
function fraction(n, d = 1n, approximate = false) {
    if (d === 0n) throw new RangeError('0で割ることはできません。');
    if (d < 0n) [n, d] = [-n, -d];
    let a = abs(n);
    let b = d;
    while (b !== 0n) [a, b] = [b, a % b];
    n /= a;
    d /= a;
    if (abs(n).toString().length > MAX_FRACTION_DIGITS || d.toString().length > MAX_FRACTION_DIGITS) {
        throw new RangeError('計算途中の値を保持できる桁数を超えています。');
    }
    return {n, d, approximate};
}

/**
 * 小数文字列を正確な分数へ変換する。
 * @param {string} text 小数。科学関数の出力のみ指数表記を含む場合がある。
 * @param {boolean} [approximate] 元の値が近似値かどうか。
 * @returns {Fraction} 文字列の値と等しい分数。
 */
function fromDecimal(text, approximate = false) {
    const [mantissa, exponent = '0'] = text.replace(/^-/, '').split('e');
    const [whole, decimals = ''] = mantissa.split('.');
    const shift = Number(exponent) - decimals.length;
    const coefficient = BigInt(whole + decimals) * (text.startsWith('-') ? -1n : 1n);
    return shift >= 0
        ? fraction(coefficient * 10n ** BigInt(shift), 1n, approximate)
        : fraction(coefficient, 10n ** BigInt(-shift), approximate);
}

const PI = fromDecimal('3.1415926535897932384626433832795028841971693993751', true);

/**
 * 分子と分母の有効桁の比と、小数点を動かす桁数を取り出す。
 * @param {Fraction} value 変換する分数。
 * @returns {{coefficient: number, shift: number}} 値は係数×10のshift乗に相当する。
 */
function scale({n, d}) {
    const numerator = abs(n).toString();
    const denominator = d.toString();
    return {
        coefficient: (n < 0n ? -1 : 1) * Number(numerator.slice(0, 17)) / Number(denominator.slice(0, 17)),
        shift: Math.max(numerator.length - 17, 0) - Math.max(denominator.length - 17, 0),
    };
}

/** @param {Fraction} value 近似する分数。 @returns {number} JavaScriptの倍精度数値。 */
function toNumber(value) {
    const {coefficient, shift} = scale(value);
    return Number(scientific(coefficient, shift));
}

/** @param {number} coefficient 有限な係数。 @param {number} shift 追加の10進指数。 @returns {string} 指数表記。 */
function scientific(coefficient, shift) {
    const [mantissa, exponent] = coefficient.toExponential().split('e');
    return `${mantissa}e${Number(exponent) + shift}`;
}

/** @param {Fraction} value 計算途中または入力の値。 @returns {Fraction} 範囲内の値。 @throws {RangeError} 絶対値が1兆を超えたとき。 */
function bounded(value) {
    if (abs(value.n) > MAX_VALUE * value.d) throw new RangeError('計算値の絶対値は1兆までです。');
    return value;
}

/** @param {Fraction} a 左辺。 @param {Fraction} b 右辺。 @param {string} operator 四則演算子。 @returns {Fraction} 計算結果。 */
function arithmetic(a, b, operator) {
    const approximate = a.approximate || b.approximate;
    if (operator === '*') return bounded(fraction(a.n * b.n, a.d * b.d, approximate));
    if (operator === '/') return bounded(fraction(a.n * b.d, a.d * b.n, approximate));
    const right = b.n * a.d * (operator === '-' ? -1n : 1n);
    return bounded(fraction(a.n * b.d + right, a.d * b.d, approximate));
}

/** @param {number} result 科学関数等で求めた値。 @returns {Fraction} 近似値。 @throws {RangeError} 有限な数を得られなかったとき。 */
function approximateFraction(result) {
    if (!Number.isFinite(result)) throw new RangeError('計算値が扱える範囲を超えています。');
    return bounded(fromDecimal(result.toString(), true));
}

/** @param {Fraction} base 底。 @param {Fraction} exponent 指数。 @returns {Fraction} べき乗。 @throws {RangeError} 実数の定義域外や数値範囲外の場合。 */
function power(base, exponent) {
    if (base.n === 0n && exponent.n <= 0n) throw new RangeError('0の0乗や負の数乗は定義されません。');
    const integer = exponent.d === 1n;
    if (base.n < 0n && !integer) throw new RangeError('負の底には整数の指数を指定してください。');
    const absoluteExponent = abs(exponent.n);
    const largest = Math.max(abs(base.n).toString().length, base.d.toString().length);
    if (integer && absoluteExponent * BigInt(largest) <= BigInt(MAX_FRACTION_DIGITS)) {
        const n = base.n ** absoluteExponent;
        const d = base.d ** absoluteExponent;
        const approximate = base.approximate || exponent.approximate;
        return bounded(exponent.n < 0n ? fraction(d, n, approximate) : fraction(n, d, approximate));
    }
    // 1に近い底は、底を倍精度に丸めると大きな指数で誤差が増える。
    const delta = toNumber(fraction(abs(base.n) - base.d, base.d));
    const absoluteBase = Math.abs(toNumber(base));
    const numericExponent = toNumber(exponent);
    const magnitude = Math.abs(delta) < 0.5
        ? Math.exp(Math.log1p(delta) * numericExponent)
        : absoluteBase ** numericExponent;
    const result = base.n < 0n && exponent.n % 2n !== 0n ? -magnitude : magnitude;
    if (result === 0 && base.n !== 0n) throw new RangeError('計算途中の値を保持できる桁数を超えています。');
    return approximateFraction(result);
}

/**
 * 四分円単位で最も近い基準角からの差を求めてから三角関数を計算する。
 * @param {string} name sin、cos、tanのいずれか。
 * @param {Fraction} value 角度。
 * @param {'DEG'|'RAD'} angle valueの単位。
 * @returns {Fraction} 三角関数の値。定義域外のtanはエラー。
 */
function trig(name, value, angle) {
    const [n, d] = angle === 'DEG' ? [value.n, value.d * 90n] : [2n * value.n * PI.d, value.d * PI.n];
    const nearest = ((2n * abs(n) + d) / (2n * d)) * (n < 0n ? -1n : 1n);
    const quadrant = Number((nearest % 4n + 4n) % 4n);
    const residual = n - nearest * d;
    if (residual === 0n) {
        if (name === 'sin') return fraction(BigInt([0, 1, 0, -1][quadrant]));
        if (name === 'cos') return fraction(BigInt([1, 0, -1, 0][quadrant]));
        if (quadrant % 2) throw new RangeError('この角度のtanは定義されません。');
        return fraction(0n);
    }
    const radians = toNumber(fraction(residual, d)) * Math.PI / 2;
    const s = Math.sin(radians);
    const c = Math.cos(radians);
    const sin = [s, c, -s, -c][quadrant];
    const cos = [c, -s, -c, s][quadrant];
    const result = name === 'sin' ? sin : name === 'cos' ? cos : sin / cos;
    if (result === 0) throw new RangeError('計算途中の値を保持できる桁数を超えています。');
    return approximateFraction(result);
}

/** @param {string} name 許可された関数名。 @param {Fraction} value 引数。 @param {'DEG'|'RAD'} angle 角度単位。 @returns {Fraction} 計算結果。 */
function applyFunction(name, value, angle) {
    if (name === 'abs') return {...value, n: abs(value.n)};
    if (name === 'sqrt') {
        if (value.n < 0n) throw new RangeError('平方根には0以上の数を指定してください。');
        const {coefficient, shift} = scale(value);
        const rootShift = Math.floor(shift / 2);
        const root = Math.sqrt(coefficient * 10 ** (shift - 2 * rootShift));
        const result = bounded(fromDecimal(scientific(root, rootShift), true));
        const exact = result.n ** 2n * value.d === value.n * result.d ** 2n;
        return {...result, approximate: value.approximate || !exact};
    }
    if (name === 'log' || name === 'ln') {
        if (value.n <= 0n) throw new RangeError('対数には正の数を指定してください。');
        const delta = toNumber(fraction(value.n - value.d, value.d));
        const {coefficient, shift} = scale(value);
        const log = Math.abs(delta) < 0.5 ? Math.log1p(delta) : Math.log(coefficient) + shift * Math.LN10;
        if (log === 0 && value.n !== value.d) throw new RangeError('計算途中の値を保持できる桁数を超えています。');
        return approximateFraction(name === 'ln' ? log : log / Math.LN10);
    }
    return trig(name, value, angle);
}

/**
 * 有効12桁に四捨五入し、指数表記や桁区切りを使わず表示する。
 * @param {Fraction} value 計算結果。
 * @returns {{text: string, approximate: boolean}} 表示文字列と近似の有無。
 * @throws {RangeError} 非ゼロの結果が表示下限を下回った場合。
 */
function format({n, d, approximate}) {
    if (n === 0n) return {text: '0', approximate};
    const magnitude = abs(n);
    if (magnitude * MAX_VALUE < d) throw new RangeError('結果の絶対値が0.000000000001未満です。');
    let exponent = magnitude.toString().length - d.toString().length;
    const below = exponent >= 0 ? magnitude < d * 10n ** BigInt(exponent) : magnitude * 10n ** BigInt(-exponent) < d;
    if (below) exponent--;
    const shift = 11 - exponent;
    const numerator = shift >= 0 ? magnitude * 10n ** BigInt(shift) : magnitude;
    const denominator = shift < 0 ? d * 10n ** BigInt(-shift) : d;
    const remainder = numerator % denominator;
    const digits = (numerator / denominator + (2n * remainder >= denominator ? 1n : 0n)).toString();
    const point = digits.length - shift;
    let text = point <= 0 ? `0.${'0'.repeat(-point)}${digits}` : `${digits.slice(0, point)}.${digits.slice(point)}`;
    if (point > digits.length) text = digits.padEnd(point, '0');
    if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '');
    return {text: (n < 0n ? '-' : '') + text, approximate: approximate || remainder !== 0n};
}

/**
 * 許可された字句だけを読み取り、演算子の優先順位に従って評価する。
 * @param {string} source 改行を含まない256文字までの式。
 * @param {'DEG'|'RAD'} angle 三角関数の角度単位。
 * @returns {{text: string, approximate: boolean}} 画面表示用の計算結果。
 * @throws {Error} 入力・構文・数値の定義域や範囲に問題があった場合。
 */
export function calculate(source, angle) {
    if (source.length > EXPRESSION_LIMIT || /[\r\n]/.test(source)) throw new Error('式は改行を含まない256文字以内で入力してください。');
    const symbols = {'×': '*', '÷': '/', '−': '-', 'π': 'pi'};
    const normalized = source.replace(/[０-９＋－＊／＾％（）．]/g, (character) => character.normalize('NFKC'));
    const tokens = Array.from(normalized.matchAll(/\d+(?:\.\d*)?|\.\d+|[a-z]+|[^\s]/g), (match) => ({
        text: symbols[match[0]] ?? match[0],
        index: match.index,
    }));
    let position = 0;
    /** @returns {string|undefined} 次の字句。 */
    const peek = () => tokens[position]?.text;
    /** @returns {number} 次の字句がある位置。先頭は1文字目。 */
    const column = () => (tokens[position]?.index ?? source.length) + 1;
    /** @param {string} expected 期待する字句。 @returns {boolean} 一致して消費できたか。 */
    const accept = (expected) => {
        if (peek() !== expected) return false;
        position++;
        return true;
    };

    /** @param {number} depth 現在の括弧の深さ。 @returns {Fraction} 括弧内の計算結果。 */
    function group(depth) {
        if (depth >= 32) throw new Error('括弧の入れ子は32段までです。');
        const value = sum(depth + 1);
        if (!accept(')')) throw new Error(`${column()}文字目：閉じ括弧がありません。`);
        return value;
    }

    /** @param {number} depth 現在の括弧の深さ。 @returns {Fraction} 値または関数計算結果。 */
    function primary(depth) {
        if (accept('(')) return group(depth);
        const token = peek() ?? '';
        const tokenColumn = column();
        position++;
        if (NUMBER.test(token)) {
            const significant = token.replace('.', '').replace(/^0+|0+$/g, '');
            if (significant.length > 12) throw new Error('入力する数値は有効12桁までです。');
            return bounded(fromDecimal(token));
        }
        if (token === 'pi') return PI;
        if (FUNCTIONS.includes(token)) {
            if (!accept('(')) throw new Error(`${column()}文字目：関数の引数は括弧で囲んでください。`);
            return applyFunction(token, group(depth), angle);
        }
        if (/^[a-z]+$/.test(token)) throw new Error(`${tokenColumn}文字目：「${token}」は使える関数・記号の一覧にありません。`);
        throw new Error(`${tokenColumn}文字目：数値、括弧、関数が必要です。`);
    }

    /** @param {number} depth 現在の括弧の深さ。 @returns {Fraction} 符号と後置％、右結合のべき乗を適用した値。 */
    function signed(depth) {
        if (accept('+')) return signed(depth);
        if (accept('-')) {
            const value = signed(depth);
            return {...value, n: -value.n};
        }
        let base = primary(depth);
        if (accept('%')) base = fraction(base.n, base.d * 100n, base.approximate);
        return accept('^') ? power(base, signed(depth)) : base;
    }

    /** @param {number} depth 現在の括弧の深さ。 @returns {Fraction} 乗除の結果。 */
    function product(depth) {
        let value = signed(depth);
        while (peek() === '*' || peek() === '/') {
            const operator = peek();
            position++;
            value = arithmetic(value, signed(depth), operator);
        }
        return value;
    }

    /** @param {number} depth 現在の括弧の深さ。 @returns {Fraction} 加減の結果。 */
    function sum(depth) {
        let value = product(depth);
        while (peek() === '+' || peek() === '-') {
            const operator = peek();
            position++;
            value = arithmetic(value, product(depth), operator);
        }
        return value;
    }

    const value = sum(0);
    if (position !== tokens.length) throw new Error(`${column()}文字目：式を確認してください。掛け算には * を付けます。`);
    return format(value);
}
