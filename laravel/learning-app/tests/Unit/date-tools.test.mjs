/**
 * @file 日付エンジンをNodeで検証する。画面/通信は扱わず、境界・不正入力・往復変換を確認する。
 * 全日付の往復は実装内の整合性の検査であり、暦資料との全日照合ではない。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {MIN_DATE, MAX_DATE, parseCivilDate, validateYear, japanToday, westernToEra, eraToWestern, eraSegments, eraTable, daysBetween, shiftDays, ageAt} from '../../resources/js/date-tools-engine.js';

// 改元の前日/当日と対応範囲の両端を固定値で確認する。
test('era transitions use exact dates, including both supported bounds', () => {
    for (const [date, label] of [
        [MIN_DATE, '明治6年1月1日'], ['1912-07-29', '明治45年7月29日'], ['1912-07-30', '大正元年7月30日'],
        ['1926-12-24', '大正15年12月24日'], ['1926-12-25', '昭和元年12月25日'],
        ['1989-01-07', '昭和64年1月7日'], ['1989-01-08', '平成元年1月8日'],
        ['2019-04-30', '平成31年4月30日'], ['2019-05-01', '令和元年5月1日'], [MAX_DATE, '令和82年12月31日'],
    ]) assert.equal(westernToEra(date), label);
});
// 年だけの変換でも改元年の片方の元号を落とさず、期間を年内に絞る。
test('year-only conversion retains both eras and restricts intervals', () => {
    assert.deepEqual(eraSegments('2019').map(({label, start, end}) => ({label, start, end})), [
        {label: '平成31年', start: '2019-01-01', end: '2019-04-30'},
        {label: '令和元年', start: '2019-05-01', end: '2019-12-31'},
    ]);
    for (const year of [1912, 1926, 1989, 2019]) assert.equal(eraSegments(year).length, 2);
});
// 元年の表記2種類、元号の終了年、改元境界を越えた年月日を確認する。
test('reverse conversion accepts 1 or 元 and rejects invalid dates/years', () => {
    for (const year of ['1', '元']) {
        assert.equal(eraToWestern('令和', year, '5', '1').date, '2019-05-01');
        assert.equal(eraToWestern('令和', year).year, 2019);
    }
    assert.equal(eraToWestern('平成', '31').end, '2019-04-30');
    for (const args of [['令和', '元', '4', '30'], ['平成', '31', '5', '1'], ['平成', '32'], ['明治', '5'], ['大正', '16'], ['昭和', '64', '1', '8'], ['明治', '45', '7', '30']]) assert.throws(() => eraToWestern(...args));
    for (const value of ['0', '-1', '1e1', '1.5', '01', '', '<script>']) assert.throws(() => eraToWestern('令和', value));
    assert.throws(() => eraToWestern('unknown', '1'));
});
// Dateが正規化してしまう不正日付と、範囲/書式違反を拒否する。
test('strict Gregorian validation prevents date normalization and out-of-range input', () => {
    for (const date of ['1900-02-29', '2100-02-29', '2026-04-31', '2026-13-01', '2026-00-00', '1872-12-31', '2101-01-01', '2026-2-01', '', '2026-01-01T00:00:00Z']) assert.throws(() => parseCivilDate(date), date);
    assert.equal(parseCivilDate('2000-02-29').toISOString(), '2000-02-29T00:00:00.000Z');
    for (const value of ['', '1e3', '2026.0', ' 2026', '1872', '2101']) assert.throws(() => validateYear(value));
});
// 50年は許可し51年は拒否する。単年でも改元した年には2元号を残す。
test('table uses inclusive limit and retains transition rows', () => {
    assert.equal(eraTable('1900', '1949').length, 50);
    assert.equal(eraTable('1989', '1989')[0].segments.length, 2);
    assert.throws(() => eraTable('1900', '1950'), /50年/);
    assert.throws(() => eraTable('2026', '2025'), /開始年/);
});
// うるう日、同日0/1日、前後移動と対応範囲の逸脱を確認する。
test('day calculations support leap days, zero and both endpoint choices', () => {
    assert.equal(daysBetween('2024-02-28', '2024-03-01'), 2);
    assert.equal(daysBetween('2024-02-28', '2024-03-01', true), 3);
    assert.equal(daysBetween('2026-11-08', '2026-11-08'), 0);
    assert.equal(daysBetween('2026-11-08', '2026-11-08', true), 1);
    assert.equal(shiftDays('2000-02-28', '1', 'after'), '2000-02-29');
    assert.equal(shiftDays('2000-03-01', '1', 'before'), '2000-02-29');
    assert.equal(shiftDays('2026-11-08', '0', 'before'), '2026-11-08');
    assert.throws(() => daysBetween('2026-11-09', '2026-11-08'));
    assert.throws(() => shiftDays(MIN_DATE, '1', 'before'));
    assert.throws(() => shiftDays(MAX_DATE, '1', 'after'));
    for (const count of ['', '-1', '1.5', '1e2', '100001']) assert.throws(() => shiftDays('2026-01-01', count, 'after'));
    assert.throws(() => shiftDays('2026-01-01', '1', 'invalid'));
});
// 夏時間切替のある日でも、UTCの日付差は1日になることを確認する。
test('daylight-saving transition dates remain one civil day apart', () => {
    assert.equal(daysBetween('2026-03-08', '2026-03-09'), 1);
    assert.equal(daysBetween('2026-11-01', '2026-11-02'), 1);
});
// 誕生日前日/当日と、平年/うるう年の2月29日生まれの切替を確認する。
test('age follows reference date and selected leap-day anniversary', () => {
    assert.equal(ageAt('2000-11-08', '2026-11-07'), 25);
    assert.equal(ageAt('2000-11-08', '2026-11-08'), 26);
    assert.equal(ageAt('2000-11-08', '2000-11-08'), 0);
    assert.equal(ageAt('2000-02-29', '2025-02-28', 'march'), 24);
    assert.equal(ageAt('2000-02-29', '2025-02-28', 'february'), 25);
    assert.equal(ageAt('2000-02-29', '2025-03-01', 'march'), 25);
    assert.equal(ageAt('2000-02-29', '2024-02-28', 'february'), 23);
    assert.equal(ageAt('2000-02-29', '2024-02-29', 'march'), 24);
    assert.throws(() => ageAt('2026-11-09', '2026-11-08'));
    assert.throws(() => ageAt('2000-02-29', '2025-02-28', 'unknown'));
});
// UTCの15時を境に日本の日付が切り替わることを確認する。
test('today uses Japan date even if the browser date is still the previous day', () => {
    assert.equal(japanToday(new Date('2026-11-07T14:59:59Z')), '2026-11-07');
    assert.equal(japanToday(new Date('2026-11-07T15:00:00Z')), '2026-11-08');
});
// 対応する全日付を1日ずつ進め、西暦→元号→西暦で同じ日へ戻ることを確認する。
test('every supported date round-trips through an era with no gaps', () => {
    const first = parseCivilDate(MIN_DATE).getTime(), last = parseCivilDate(MAX_DATE).getTime();
    for (let timestamp = first; timestamp <= last; timestamp += 86400000) {
        const date = new Date(timestamp).toISOString().slice(0, 10);
        const segment = eraSegments(Number(date.slice(0, 4))).find(item => item.start <= date && item.end >= date);
        assert.ok(segment, date);
        assert.equal(eraToWestern(segment.name, segment.year, date.slice(5, 7), date.slice(8)).date, date);
    }
});
