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

// Decimal inputs and unit definitions stay rational until the final display rounding.
const gcd = (a, b) => b ? gcd(b, a % b) : a;
function rational(numerator, denominator = 1n) {
    if (denominator < 0n) {
        numerator = -numerator;
        denominator = -denominator;
    }
    const divisor = gcd(numerator < 0n ? -numerator : numerator, denominator);
    return [numerator / divisor, denominator / divisor];
}
function decimal(value) {
    const input = String(value);
    const [integer, fraction = ''] = input.replace(/^[+-]/, '').split('.');
    const numerator = BigInt((integer || '0') + fraction) * (input.startsWith('-') ? -1n : 1n);
    return rational(numerator, 10n ** BigInt(fraction.length));
}
const multiply = (a, b) => rational(a[0] * b[0], a[1] * b[1]);
const divide = (a, b) => rational(a[0] * b[1], a[1] * b[0]);
const add = (a, b) => rational(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const subtract = (a, b) => add(a, [-b[0], b[1]]);
const factor = unit => Array.isArray(unit.factor)
    ? divide(decimal(unit.factor[0]), decimal(unit.factor[1])) : decimal(unit.factor);

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

    // Scale the leading twelve digits into an integer, then round the remainder once.
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

export function convertUnits(category, fromId, toId, raw) {
    const group = UNIT_GROUPS[category];
    const from = group?.units?.find(unit => unit.id === fromId);
    const to = group?.units?.find(unit => unit.id === toId);
    if (!from || !to) throw new Error('分類と単位を選び直してください。');
    const value = parseInput(raw);
    let converted;
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

export function referenceRelation(category, unit) {
    if (category === 'temperature') {
        return unit.id === 'c' ? 'K = °C + 273.15'
            : unit.id === 'f' ? '°C = (°F − 32) × 5 ÷ 9' : '0 K = −273.15 °C';
    }
    const formatted = display(factor(unit));
    return `1 ${unit.symbol} ${formatted.rounded ? '≈' : '='} ${formatted.text} ${UNIT_GROUPS[category].base}`;
}
