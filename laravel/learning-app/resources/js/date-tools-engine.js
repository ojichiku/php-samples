/**
 * @file ブラウザーの日付・元号ツールから使う計算処理。画面の描画や通信は行わない。
 * 日付はグレゴリオ暦の年月日として扱い、UTCで計算して端末の時差や夏時間の影響を避ける。
 * 入力が不正な場合はErrorを投げ、呼び出し元が画面へエラーを表示する。
 */
// 元号境界の参照先: https://eco.mtk.nao.ac.jp/koyomi/wiki/CEF2BBCB2FB8B5B9E6.html
export const MIN_DATE = '1873-01-01';
export const MAX_DATE = '2100-12-31';
// 早見表を一度に生成する年数の上限。DAYはUTCの日付計算に使う1日分のミリ秒。
export const TABLE_LIMIT = 50;
const DAY = 86400000;
/**
 * 元号と指定した西暦年が重なる期間。
 * @typedef {Object} EraSegment
 * @property {string} name 元号名。
 * @property {number} year 元号年（1以上、単位は年）。
 * @property {string} label 元号名と元号年の表示（例：令和元年）。
 * @property {string} start その西暦年内の有効開始日（YYYY-MM-DD、当日を含む）。
 * @property {string} end その西暦年内の有効終了日（YYYY-MM-DD、当日を含む）。
 */
// baseを西暦年から引くと元号年になる。start/endは対応範囲内の両端を含む。
export const ERAS = Object.freeze([
    {name: '明治', base: 1867, start: MIN_DATE, end: '1912-07-29'},
    {name: '大正', base: 1911, start: '1912-07-30', end: '1926-12-24'},
    {name: '昭和', base: 1925, start: '1926-12-25', end: '1989-01-07'},
    {name: '平成', base: 1988, start: '1989-01-08', end: '2019-04-30'},
    {name: '令和', base: 2018, start: '2019-05-01', end: MAX_DATE},
].map(Object.freeze));

/**
 * 4桁の年を1873〜2100の範囲で検証し、数値として返す。
 *
 * @param {string|number} value 検証する西暦年（4桁、1873〜2100）。
 * @returns {number} 検証済みの西暦年（単位：年）。
 * @throws {Error} 4桁の数字でない、または対応範囲外の場合。
 */
export function validateYear(value) {
    const input = String(value);
    if (!/^\d{4}$/.test(input) || Number(input) < 1873 || Number(input) > 2100) {
        throw new Error('年は1873〜2100の整数で入力してください。');
    }
    return Number(input);
}

/**
 * YYYY-MM-DDを検証し、該当日のUTC午前0時のDateを返す。存在しない日付・範囲外はエラー。
 *
 * @param {string} value 検証する日付（YYYY-MM-DD、1873-01-01〜2100-12-31）。
 * @returns {Date} 指定日のUTC午前0時を表すDate。
 * @throws {Error} 書式が不正、存在しない日付、または対応範囲外の場合。
 */
export function parseCivilDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('年月日を入力してください。');
    }
    const [year, month, day] = value.split('-').map(Number);
    // Dateは2月30日などを翌月へ繰り越すため、変換前の年月日と照合して拒否する。
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
        throw new Error('存在しない日付です。月と日を確認してください。');
    }
    if (value < MIN_DATE || value > MAX_DATE) {
        throw new Error('日付は1873年1月1日〜2100年12月31日で入力してください。');
    }
    return date;
}

/**
 * 渡された時刻（省略時は現在）を日本時間のYYYY-MM-DDへ変換する。
 *
 * @param {Date} [now=new Date()] 日本時間の日付を求める対象時刻。
 * @returns {string} 日本時間の年月日（YYYY-MM-DD）。
 * @throws {RangeError} nowが無効なDateの場合。
 */
export function japanToday(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    /**
     * @param {string} type year/month/dayの日時要素名。
     * @returns {string} 日本時間で書式化した該当部分。
     */
    const part = type => parts.find(item => item.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}

/**
 * 対応範囲内のYYYY-MM-DDを「年・月・日」の日本語表示にする。
 *
 * @param {string} value 対応範囲内の日付（YYYY-MM-DD）。
 * @returns {string} 「2026年11月15日」の形式の日付表示。
 * @throws {Error} 日付が不正、または対応範囲外の場合。
 */
export function dateLabel(value) {
    parseCivilDate(value);
    const [year, month, day] = value.split('-').map(Number);
    return `${year}年${month}月${day}日`;
}

/**
 * 元号の1年目だけ「元」、それ以外は数字の文字列で表示する。
 *
 * @param {number} year 元号年（1以上の整数、単位：年）。この関数内では検証しない。
 * @returns {string} 1年目は「元」、それ以外は数字の文字列。
 */
export const eraYearLabel = year => year === 1 ? '元' : String(year);

/**
 * 指定した西暦年と重なる元号を、元号年・表示名・その年内の有効期間の配列で返す。
 *
 * @param {string|number} value 西暦年（1873〜2100）。
 * @returns {EraSegment[]} 年内に有効な元号の期間。改元した年は複数要素になる。
 * @throws {Error} 西暦年が不正、または対応範囲外の場合。
 */
export function eraSegments(value) {
    const year = validateYear(value), first = `${year}-01-01`, last = `${year}-12-31`;
    // 改元のあった年は複数の元号が重なる。それぞれの期間を指定年の内側へ絞る。
    return ERAS.filter(era => era.start <= last && era.end >= first).map(era => ({
        name: era.name,
        year: year - era.base,
        label: `${era.name}${eraYearLabel(year - era.base)}年`,
        start: era.start > first ? era.start : first,
        end: era.end < last ? era.end : last,
    }));
}

/**
 * 対応範囲内の西暦年月日を、その日に有効な元号の年月日表示へ変換する。
 *
 * @param {string} value 対応範囲内の西暦年月日（YYYY-MM-DD）。
 * @returns {string} 元号を使った年月日表示（例：令和元年5月1日）。
 * @throws {Error} 日付が不正、または対応範囲外の場合。
 */
export function westernToEra(value) {
    parseCivilDate(value);
    const era = ERAS.find(item => value >= item.start && value <= item.end);
    const [year, month, day] = value.split('-').map(Number);
    return `${era.name}${eraYearLabel(year - era.base)}年${month}月${day}日`;
}

/**
 * 元号名と元号年（「元」も可）を西暦へ変換する。月日省略時は年内の有効期間、指定時は日付も返す。
 *
 * @param {string} name 元号名（明治・大正・昭和・平成・令和）。
 * @param {string|number} value 元号年（1以上の整数、または「元」、単位：年）。
 * @param {string|number|null} [month=null] 月（1〜12）。年だけの変換ではdayと共に省略する。
 * @param {string|number|null} [day=null] 日（1〜31、実在する月日）。年だけの変換ではmonthと共に省略する。
 * @returns {{name: string, year: number, label: string, start: string, end: string, date?: string}} 元号名・西暦年・元号表示・年内の有効期間。月日指定時のみdate（YYYY-MM-DD）も返す。yearはEraSegmentと異なり西暦年。
 * @throws {Error} 元号・年・月日が不正、対応範囲外、または元号の期間外の場合。
 */
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
    // 年だけの変換と年月日の変換を分け、月日指定時は改元の境界日まで検証する。
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

/**
 * 開始年から終了年までの早見表用データを返す。逆順や50年超の指定はエラー。
 *
 * @param {string|number} start 開始する西暦年（1873〜2100、当年を含む）。
 * @param {string|number} end 終了する西暦年（1873〜2100、当年を含む）。
 * @returns {Array<{year: number, segments: EraSegment[]}>} 西暦年と年内の元号期間を開始年から順に並べた配列。
 * @throws {Error} 年が不正・対応範囲外、終了年が開始年より前、または51年分以上の場合。
 */
export function eraTable(start, end) {
    const first = validateYear(start), last = validateYear(end);
    if (last < first) throw new Error('終了年は開始年以降にしてください。');
    if (last - first + 1 > TABLE_LIMIT) throw new Error('一度に表示できるのは50年分までです。範囲を短くしてください。');
    return Array.from({length: last - first + 1}, (_, index) => ({year: first + index, segments: eraSegments(first + index)}));
}

/**
 * 開始日から終了日までの日数を返す。includeStartがtrueなら開始日も1日として数える。
 *
 * @param {string} start 開始日（対応範囲内のYYYY-MM-DD）。
 * @param {string} end 終了日（開始日以降のYYYY-MM-DD）。
 * @param {boolean} [includeStart=false] trueなら開始日も1日として数える。同日指定ではfalseなら0日、trueなら1日。
 * @returns {number} 整数の日数（単位：日）。
 * @throws {Error} 日付が不正・対応範囲外、または終了日が開始日より前の場合。
 */
export function daysBetween(start, end, includeStart = false) {
    const first = parseCivilDate(start), last = parseCivilDate(end);
    if (last < first) throw new Error('終了日は開始日以降にしてください。');
    return Math.round((last - first) / DAY) + (includeStart ? 1 : 0);
}

/**
 * 開始日の前後へ0〜100000日移動し、対応範囲内のYYYY-MM-DDを返す。directionはbefore/after。
 *
 * @param {string} start 基準日（対応範囲内のYYYY-MM-DD）。
 * @param {string|number} count 移動する日数（0〜100000の整数、単位：日）。
 * @param {"before"|"after"} direction beforeは前、afterは後へ移動する。
 * @returns {string} 移動後の日付（YYYY-MM-DD）。
 * @throws {Error} 日付・日数・方向が不正、または移動後の日付が対応範囲外の場合。
 */
export function shiftDays(start, count, direction) {
    const date = parseCivilDate(start), input = String(count);
    if (!/^\d{1,6}$/.test(input) || Number(input) > 100000) throw new Error('日数は0〜100000の整数で入力してください。');
    if (!['before', 'after'].includes(direction)) throw new Error('前または後を選んでください。');
    const result = new Date(date.getTime() + Number(input) * (direction === 'after' ? DAY : -DAY)).toISOString().slice(0, 10);
    parseCivilDate(result);
    return result;
}

/**
 * 誕生日と基準日から満年齢を返す。平年の2月29日生まれはmarchなら3月1日、februaryなら2月28日を区切りにする。
 *
 * @param {string} birthday 誕生日（対応範囲内のYYYY-MM-DD）。
 * @param {string} reference 基準日（誕生日以降のYYYY-MM-DD）。
 * @param {"march"|"february"} [leapDayPolicy="march"] 平年の2月29日生まれの切替日。marchは3月1日、februaryは2月28日。
 * @returns {number} 基準日時点の満年齢（0以上の整数、単位：歳）。
 * @throws {Error} 日付・切替方法が不正、対応範囲外、または基準日が誕生日より前の場合。
 */
export function ageAt(birthday, reference, leapDayPolicy = 'march') {
    const birth = parseCivilDate(birthday), at = parseCivilDate(reference);
    if (at < birth) throw new Error('基準日は誕生日以降にしてください。');
    if (!['march', 'february'].includes(leapDayPolicy)) throw new Error('2月29日生まれの計算方法を選んでください。');
    const [birthYear, birthMonth, birthDay] = birthday.split('-').map(Number);
    const [year, month, day] = reference.split('-').map(Number);
    let anniversaryMonth = birthMonth, anniversaryDay = birthDay;
    // 基準年に2月29日がなければ、選択された方針に合わせて年齢の切替日を決める。
    if (birthMonth === 2 && birthDay === 29 && new Date(Date.UTC(year, 1, 29)).getUTCMonth() !== 1) {
        anniversaryMonth = leapDayPolicy === 'march' ? 3 : 2;
        anniversaryDay = anniversaryMonth === 3 ? 1 : 28;
    }
    // 基準日が今年の切替日より前なら、西暦年の差から1歳引く。
    return year - birthYear - (month < anniversaryMonth || (month === anniversaryMonth && day < anniversaryDay) ? 1 : 0);
}
