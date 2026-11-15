/**
 * @file 単位定義と換算計算。UIから呼び出し、通信やDOM操作は行わない。
 * 小数をBigIntの分数に変換し、中間計算を丸めず、表示時だけ有効数字12桁へ丸める。
 */
/**
 * @typedef {[bigint, bigint]} Rational 分子・正の分母の組。数値の単位は呼出し元の換算段階に従う。
 */
/**
 * @typedef {Object} UnitDefinition
 * @property {string} id 分類内の単位ID。
 * @property {string} name 日本語の単位名。
 * @property {string} symbol 表示用の記号。
 * @property {string|string[]} factor 基準単位への係数。小数文字列、または分子/分母の文字列ペア。温度では使用しない。
 * @property {string} note 表記に関する補足。
 */
// baseは各分類の基準単位。温度は係数ではなくオフセットを含む専用式を使う。
export const UNIT_GROUPS = {
    "length": {
        "name": "長さ",
        "base": "m",
        "hint": "身長・距離・海外製品の寸法に。マイルは陸上マイルです。",
        "units": [
            {
                "id": "mm",
                "name": "ミリメートル",
                "symbol": "mm",
                "factor": "0.001",
                "note": ""
            },
            {
                "id": "cm",
                "name": "センチメートル",
                "symbol": "cm",
                "factor": "0.01",
                "note": ""
            },
            {
                "id": "m",
                "name": "メートル",
                "symbol": "m",
                "factor": "1",
                "note": ""
            },
            {
                "id": "km",
                "name": "キロメートル",
                "symbol": "km",
                "factor": "1000",
                "note": ""
            },
            {
                "id": "in",
                "name": "インチ",
                "symbol": "in",
                "factor": "0.0254",
                "note": ""
            },
            {
                "id": "ft",
                "name": "フィート",
                "symbol": "ft",
                "factor": "0.3048",
                "note": ""
            },
            {
                "id": "yd",
                "name": "ヤード",
                "symbol": "yd",
                "factor": "0.9144",
                "note": ""
            },
            {
                "id": "mi",
                "name": "マイル（陸上）",
                "symbol": "mi",
                "factor": "1609.344",
                "note": ""
            }
        ]
    },
    "mass": {
        "name": "重さ",
        "base": "kg",
        "hint": "重さ（質量）を換算します。ポンド・オンスは常用質量です。",
        "units": [
            {
                "id": "mg",
                "name": "ミリグラム",
                "symbol": "mg",
                "factor": "0.000001",
                "note": ""
            },
            {
                "id": "g",
                "name": "グラム",
                "symbol": "g",
                "factor": "0.001",
                "note": ""
            },
            {
                "id": "kg",
                "name": "キログラム",
                "symbol": "kg",
                "factor": "1",
                "note": ""
            },
            {
                "id": "t",
                "name": "トン（メートルトン）",
                "symbol": "t",
                "factor": "1000",
                "note": ""
            },
            {
                "id": "lb",
                "name": "ポンド（常用質量）",
                "symbol": "lb",
                "factor": "0.45359237",
                "note": ""
            },
            {
                "id": "oz",
                "name": "オンス（常用質量）",
                "symbol": "oz",
                "factor": "0.028349523125",
                "note": ""
            }
        ]
    },
    "volume": {
        "name": "容量・体積",
        "base": "L",
        "hint": "デシリットルも選べます。米国と英国のガロンは大きさが異なります。",
        "units": [
            {
                "id": "ml",
                "name": "ミリリットル",
                "symbol": "mL",
                "factor": "0.001",
                "note": ""
            },
            {
                "id": "dl",
                "name": "デシリットル",
                "symbol": "dL",
                "factor": "0.1",
                "note": ""
            },
            {
                "id": "l",
                "name": "リットル",
                "symbol": "L",
                "factor": "1",
                "note": ""
            },
            {
                "id": "cc",
                "name": "立方センチメートル",
                "symbol": "cm³",
                "factor": "0.001",
                "note": ""
            },
            {
                "id": "cube",
                "name": "立方メートル",
                "symbol": "m³",
                "factor": "1000",
                "note": ""
            },
            {
                "id": "us",
                "name": "ガロン（米国・液量）",
                "symbol": "US gal",
                "factor": "3.785411784",
                "note": ""
            },
            {
                "id": "uk",
                "name": "ガロン（英国）",
                "symbol": "Imp gal",
                "factor": "4.54609",
                "note": ""
            }
        ]
    },
    "area": {
        "name": "面積",
        "base": "m²",
        "hint": "部屋や土地の広さに。長さとは別の分類です。",
        "units": [
            {
                "id": "cm2",
                "name": "平方センチメートル",
                "symbol": "cm²",
                "factor": "0.0001",
                "note": ""
            },
            {
                "id": "m2",
                "name": "平方メートル",
                "symbol": "m²",
                "factor": "1",
                "note": ""
            },
            {
                "id": "km2",
                "name": "平方キロメートル",
                "symbol": "km²",
                "factor": "1000000",
                "note": ""
            },
            {
                "id": "a",
                "name": "アール",
                "symbol": "a",
                "factor": "100",
                "note": ""
            },
            {
                "id": "ha",
                "name": "ヘクタール",
                "symbol": "ha",
                "factor": "10000",
                "note": ""
            }
        ]
    },
    "temperature": {
        "name": "温度",
        "base": "K",
        "hint": "温度そのものを換算します。温度差の換算ではありません。絶対零度より低い値は入力できません。",
        "units": [
            {
                "id": "c",
                "name": "セルシウス度（摂氏）",
                "symbol": "°C",
                "factor": "1",
                "note": ""
            },
            {
                "id": "f",
                "name": "ファーレンハイト度（華氏）",
                "symbol": "°F",
                "factor": "1",
                "note": ""
            },
            {
                "id": "k",
                "name": "ケルビン",
                "symbol": "K",
                "factor": "1",
                "note": ""
            }
        ]
    },
    "speed": {
        "name": "速さ",
        "base": "m/s",
        "hint": "移動の速さに。ノットは1時間に1海里（1,852 m）進む速さです。",
        "units": [
            {
                "id": "ms",
                "name": "メートル毎秒",
                "symbol": "m/s",
                "factor": "1",
                "note": ""
            },
            {
                "id": "kmh",
                "name": "キロメートル毎時",
                "symbol": "km/h",
                "factor": [
                    "1000",
                    "3600"
                ],
                "note": ""
            },
            {
                "id": "mph",
                "name": "マイル毎時",
                "symbol": "mph",
                "factor": "0.44704",
                "note": ""
            },
            {
                "id": "kn",
                "name": "ノット",
                "symbol": "kn",
                "factor": [
                    "1852",
                    "3600"
                ],
                "note": "knはこの画面での表記です"
            }
        ]
    },
    "time": {
        "name": "時間",
        "base": "s",
        "hint": "1日は24時間として換算します。月・年は長さが一定でないため対象外です。",
        "units": [
            {
                "id": "s",
                "name": "秒",
                "symbol": "s",
                "factor": "1",
                "note": ""
            },
            {
                "id": "min",
                "name": "分",
                "symbol": "min",
                "factor": "60",
                "note": ""
            },
            {
                "id": "h",
                "name": "時間",
                "symbol": "h",
                "factor": "3600",
                "note": ""
            },
            {
                "id": "day",
                "name": "日",
                "symbol": "d",
                "factor": "86400",
                "note": ""
            }
        ]
    },
    "energy": {
        "name": "エネルギー",
        "base": "J",
        "hint": "熱量・電力量を換算します。cal・kcalは熱化学カロリー（1 cal = 4.184 J）です。W（電力）は別の量です。",
        "units": [
            {
                "id": "j",
                "name": "ジュール",
                "symbol": "J",
                "factor": "1",
                "note": ""
            },
            {
                "id": "kj",
                "name": "キロジュール",
                "symbol": "kJ",
                "factor": "1000",
                "note": ""
            },
            {
                "id": "cal",
                "name": "カロリー（熱化学）",
                "symbol": "cal",
                "factor": "4.184",
                "note": ""
            },
            {
                "id": "kcal",
                "name": "キロカロリー（熱化学）",
                "symbol": "kcal",
                "factor": "4184",
                "note": ""
            },
            {
                "id": "wh",
                "name": "ワット時",
                "symbol": "Wh",
                "factor": "3600",
                "note": ""
            },
            {
                "id": "kwh",
                "name": "キロワット時",
                "symbol": "kWh",
                "factor": "3600000",
                "note": ""
            }
        ]
    }
};

// 入力値と係数を分数で保持し、表示の直前まで丸めない。
/**
 * 絶対値の約分に使う最大公約数を再帰で求める。
 *
 * @param {bigint} a 非負の整数。
 * @param {bigint} b 非負の整数。
 * @returns {bigint} 最大公約数。
 */
const gcd = (a, b) => b ? gcd(b, a % b) : a;
/**
 * 分母の符号を正にそろえ、約分した分数を返す。
 *
 * @param {bigint} numerator 分子。
 * @param {bigint} [denominator=1n] 0でない分母。
 * @returns {Rational} 約分した分子/分母。
 * @throws {RangeError} 0除算になる不正な内部入力の場合。
 */
function rational(numerator, denominator = 1n) {
    if (denominator < 0n) {
        numerator = -numerator;
        denominator = -denominator;
    }
    const divisor = gcd(numerator < 0n ? -numerator : numerator, denominator);
    return [numerator / divisor, denominator / divisor];
}
/**
 * 検証済みの小数表記を、10のべき乗を分母とした分数へ変換する。
 *
 * @param {string|number} value 指数表記を使わない小数。入力検証は呼出し元で行う。
 * @returns {Rational} 元の小数と等しい分数。
 * @throws {SyntaxError} 分子をBigIntに変換できない文字列の場合。
 */
function decimal(value) {
    const input = String(value);
    const [integer, fraction = ''] = input.replace(/^[+-]/, '').split('.');
    const numerator = BigInt((integer || '0') + fraction) * (input.startsWith('-') ? -1n : 1n);
    return rational(numerator, 10n ** BigInt(fraction.length));
}
/**
 * 2つの分数を掛ける。
 *
 * @param {Rational} a 左の分数。
 * @param {Rational} b 右の分数。
 * @returns {Rational} 積を約分した分数。
 */
const multiply = (a, b) => rational(a[0] * b[0], a[1] * b[1]);
/**
 * 2つの分数を割る。
 *
 * @param {Rational} a 割られる分数。
 * @param {Rational} b 分子が0でない割る分数。
 * @returns {Rational} 商を約分した分数。
 * @throws {RangeError} 0で割った場合。
 */
const divide = (a, b) => rational(a[0] * b[1], a[1] * b[0]);
/**
 * 2つの分数を通分して足す。
 *
 * @param {Rational} a 左の分数。
 * @param {Rational} b 右の分数。
 * @returns {Rational} 和を約分した分数。
 */
const add = (a, b) => rational(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
/**
 * 右の分数の符号を反転して引く。
 *
 * @param {Rational} a 引かれる分数。
 * @param {Rational} b 引く分数。
 * @returns {Rational} 差を約分した分数。
 */
const subtract = (a, b) => add(a, [-b[0], b[1]]);
/**
 * 単位定義の係数を分数へ変換する。
 *
 * @param {UnitDefinition} unit 係数が小数または分数ペアで定義された単位。
 * @returns {Rational} この単位1に対応する基準単位の量。
 */
const factor = unit => Array.isArray(unit.factor)
    ? divide(decimal(unit.factor[0]), decimal(unit.factor[1])) : decimal(unit.factor);

/**
 * 分数を最大12桁の有効数字で表示用に丸める。
 *
 * @param {Rational} value 表示する量。
 * @returns {{text: string, rounded: boolean}} 数値文字列と、捨てた余りがあったか。単位記号は含まない。
 */
function display(value) {
    if (value[0] === 0n) return { text: '0', rounded: false };
    const negative = value[0] < 0n;
    const numerator = negative ? -value[0] : value[0];
    const denominator = value[1];
    let exponent = numerator.toString().length - denominator.toString().length;
    const belowPower = exponent >= 0
        ? numerator < denominator * 10n ** BigInt(exponent)
        : numerator * 10n ** BigInt(-exponent) < denominator;
    if (belowPower) exponent--;

    // 先頭12桁を整数へ拡大し、余りを使って一度だけ四捨五入する。
    const shift = 11 - exponent;
    const scaledNumerator = shift >= 0 ? numerator * 10n ** BigInt(shift) : numerator;
    const scaledDenominator = shift >= 0 ? denominator : denominator * 10n ** BigInt(-shift);
    let rounded = scaledNumerator / scaledDenominator;
    const remainder = scaledNumerator % scaledDenominator;
    if (remainder * 2n >= scaledDenominator) rounded++;
    if (rounded.toString().length > 12) {
        rounded /= 10n;
        exponent++;
    }
    const digits = rounded.toString().padStart(12, '0');
    let text;
    if (exponent >= 12 || exponent < -6) {
        const mantissa = (digits[0] + '.' + digits.slice(1)).replace(/\.?0+$/, '');
        text = `${mantissa}e${exponent >= 0 ? '+' : ''}${exponent}`;
    } else {
        const point = exponent + 1;
        text = point <= 0 ? '0.' + '0'.repeat(-point) + digits
            : digits.slice(0, point) + (point < digits.length ? '.' + digits.slice(point) : '');
        if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '');
    }
    return { text: (negative ? '-' : '') + text, rounded: remainder !== 0n };
}

/**
 * 半角の整数/小数を入力制限で検証し、分数として返す。
 *
 * @param {string|number} raw 入力数値。小数9桁、有効数字15桁、絶対値1兆以下、前後空白は除去。
 * @returns {Rational} 入力と等しい分数。単位はまだ適用しない。
 * @throws {Error} 64文字超、不正な書式、桁数超過、または絶対値の上限超過の場合。
 */
export function parseInput(raw) {
    const input = String(raw).trim();
    if (input.length > 64 || !/^[+-]?(?:\d+(?:\.\d{1,9})?|\.\d{1,9})$/.test(input)) {
        throw new Error('半角数字で入力してください。小数は9桁までです。カンマ・指数表記は使えません。');
    }
    if (input.replace(/^[+-]/, '').replace('.', '').replace(/^0+/, '').length > 15) {
        throw new Error('入力は有効数字15桁までにしてください。');
    }
    const value = decimal(input);
    if ((value[0] < 0n ? -value[0] : value[0]) > 1000000000000n * value[1]) {
        throw new Error('数値の絶対値は1兆以下にしてください。');
    }
    return value;
}

/**
 * 指定分類内で単位を換算し、正確な分数と表示用の値を返す。
 *
 * @param {string} category UNIT_GROUPSの分類キー。
 * @param {string} fromId 変換元の単位ID。
 * @param {string} toId 変換先の単位ID。
 * @param {string|number} raw 変換元の単位での入力数値。
 * @returns {{text: string, rounded: boolean, value: Rational, from: UnitDefinition, to: UnitDefinition}} 変換先単位の数値表示/丸め有無/分数と、元/先の単位定義。
 * @throws {Error} 単位や入力が不正、温度が絶対零度未満、または温度以外で負の場合。
 */
export function convertUnits(category, fromId, toId, raw) {
    const group = UNIT_GROUPS[category];
    const from = group?.units?.find(unit => unit.id === fromId);
    const to = group?.units?.find(unit => unit.id === toId);
    if (!from || !to) throw new Error('分類と単位を選び直してください。');
    const value = parseInput(raw);
    let converted;
    // 温度はまずKへ統一して絶対零度を判定し、変換先へ戻す。温度差の換算ではない。
    if (category === 'temperature') {
        const kelvin = from.id === 'k' ? value : from.id === 'c'
            ? add(value, decimal('273.15')) : multiply(add(value, decimal('459.67')), rational(5n, 9n));
        if (kelvin[0] < 0n) {
            throw new Error('絶対零度（−273.15 °C / −459.67 °F / 0 K）以上を入力してください。');
        }
        converted = to.id === 'k' ? kelvin : to.id === 'c'
            ? subtract(kelvin, decimal('273.15')) : subtract(multiply(kelvin, rational(9n, 5n)), decimal('459.67'));
    } else {
        if (value[0] < 0n) throw new Error('この分類では0以上の数値を入力してください。');
        converted = divide(multiply(value, factor(from)), factor(to));
    }
    return { ...display(converted), value: converted, from, to };
}

/**
 * 早見表向けに基準単位との関係または温度の式を返す。
 *
 * @param {string} category 有効な分類キー。
 * @param {UnitDefinition} unit 同じ分類の単位定義。
 * @returns {string} 単位記号を含む関係式。係数を丸めた場合は≈を含む。
 */
export function referenceRelation(category, unit) {
    if (category === 'temperature') {
        return unit.id === 'c' ? 'K = °C + 273.15'
            : unit.id === 'f' ? '°C = (°F − 32) × 5 ÷ 9' : '0 K = −273.15 °C';
    }
    const formatted = display(factor(unit));
    return `1 ${unit.symbol} ${formatted.rounded ? '≈' : '='} ${formatted.text} ${UNIT_GROUPS[category].base}`;
}
