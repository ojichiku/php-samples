// Dates are Gregorian civil dates, independent of browser timezone and daylight saving.
// Era boundaries: https://eco.mtk.nao.ac.jp/koyomi/wiki/CEF2BBCB2FB8B5B9E6.html
export const MIN_DATE = '1873-01-01';
export const MAX_DATE = '2100-12-31';
export const TABLE_LIMIT = 50;
const DAY = 86400000;
export const ERAS = Object.freeze([
    {name: '明治', base: 1867, start: MIN_DATE, end: '1912-07-29'},
    {name: '大正', base: 1911, start: '1912-07-30', end: '1926-12-24'},
    {name: '昭和', base: 1925, start: '1926-12-25', end: '1989-01-07'},
    {name: '平成', base: 1988, start: '1989-01-08', end: '2019-04-30'},
    {name: '令和', base: 2018, start: '2019-05-01', end: MAX_DATE},
].map(Object.freeze));

export function validateYear(value) {
    const input = String(value);
    if (!/^\d{4}$/.test(input) || Number(input) < 1873 || Number(input) > 2100) {
        throw new Error('年は1873〜2100の整数で入力してください。');
    }
    return Number(input);
}

export function parseCivilDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('年月日を入力してください。');
    }
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
        throw new Error('存在しない日付です。月と日を確認してください。');
    }
    if (value < MIN_DATE || value > MAX_DATE) {
        throw new Error('日付は1873年1月1日〜2100年12月31日で入力してください。');
    }
    return date;
}

export function japanToday(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const part = type => parts.find(item => item.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}

export function dateLabel(value) {
    parseCivilDate(value);
    const [year, month, day] = value.split('-').map(Number);
    return `${year}年${month}月${day}日`;
}

export const eraYearLabel = year => year === 1 ? '元' : String(year);

export function eraSegments(value) {
    const year = validateYear(value), first = `${year}-01-01`, last = `${year}-12-31`;
    return ERAS.filter(era => era.start <= last && era.end >= first).map(era => ({
        name: era.name,
        year: year - era.base,
        label: `${era.name}${eraYearLabel(year - era.base)}年`,
        start: era.start > first ? era.start : first,
        end: era.end < last ? era.end : last,
    }));
}

export function westernToEra(value) {
    parseCivilDate(value);
    const era = ERAS.find(item => value >= item.start && value <= item.end);
    const [year, month, day] = value.split('-').map(Number);
    return `${era.name}${eraYearLabel(year - era.base)}年${month}月${day}日`;
}

export function eraToWestern(name, value, month = null, day = null) {
    const era = ERAS.find(item => item.name === name);
    if (!era) throw new Error('元号を選択してください。');
    const input = String(value).trim();
    if (!/^(元|[1-9]\d{0,2})$/.test(input)) {
        throw new Error('年は1以上の整数、または「元」で入力してください。');
    }
    const number = input === '元' ? 1 : Number(input), year = era.base + number;
    validateYear(year);
    const segment = eraSegments(year).find(item => item.name === name);
    if (!segment) throw new Error('その元号に存在しない年です。元号と年を確認してください。');
    if (month === null && day === null) return {...segment, year};
    if (!/^\d{1,2}$/.test(String(month)) || !/^\d{1,2}$/.test(String(day))) {
        throw new Error('月と日を整数で入力してください。');
    }
    const date = `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
    parseCivilDate(date);
    if (date < era.start || date > era.end) {
        throw new Error('その日付は指定した元号の期間外です。元号・年・月日を確認してください。');
    }
    return {...segment, year, date};
}

export function eraTable(start, end) {
    const first = validateYear(start), last = validateYear(end);
    if (last < first) throw new Error('終了年は開始年以降にしてください。');
    if (last - first + 1 > TABLE_LIMIT) throw new Error('一度に表示できるのは50年分までです。範囲を短くしてください。');
    return Array.from({length: last - first + 1}, (_, index) => ({year: first + index, segments: eraSegments(first + index)}));
}

export function daysBetween(start, end, includeStart = false) {
    const first = parseCivilDate(start), last = parseCivilDate(end);
    if (last < first) throw new Error('終了日は開始日以降にしてください。');
    return Math.round((last - first) / DAY) + (includeStart ? 1 : 0);
}

export function shiftDays(start, count, direction) {
    const date = parseCivilDate(start), input = String(count);
    if (!/^\d{1,6}$/.test(input) || Number(input) > 100000) throw new Error('日数は0〜100000の整数で入力してください。');
    if (!['before', 'after'].includes(direction)) throw new Error('前または後を選んでください。');
    const result = new Date(date.getTime() + Number(input) * (direction === 'after' ? DAY : -DAY)).toISOString().slice(0, 10);
    parseCivilDate(result);
    return result;
}

export function ageAt(birthday, reference, leapDayPolicy = 'march') {
    const birth = parseCivilDate(birthday), at = parseCivilDate(reference);
    if (at < birth) throw new Error('基準日は誕生日以降にしてください。');
    if (!['march', 'february'].includes(leapDayPolicy)) throw new Error('2月29日生まれの計算方法を選んでください。');
    const [birthYear, birthMonth, birthDay] = birthday.split('-').map(Number);
    const [year, month, day] = reference.split('-').map(Number);
    let anniversaryMonth = birthMonth, anniversaryDay = birthDay;
    if (birthMonth === 2 && birthDay === 29 && new Date(Date.UTC(year, 1, 29)).getUTCMonth() !== 1) {
        anniversaryMonth = leapDayPolicy === 'march' ? 3 : 2;
        anniversaryDay = anniversaryMonth === 3 ? 1 : 28;
    }
    return year - birthYear - (month < anniversaryMonth || (month === anniversaryMonth && day < anniversaryDay) ? 1 : 0);
}
