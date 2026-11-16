/**
 * @file 時間ツールのLaravel画面をローカルHTTPで開き、時計を固定/進行させて状態遷移と4幅を検証するCLI。
 * 結果はローカルJSONへ保存する。外部通信を遮断し、PNGを生成しない。
 */
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw Error('Local test URL required');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({ headless: true });
 const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Los_Angeles' });
 const errors = [], external = [], checks = [];
 page.on('pageerror', error => errors.push(error.message));
 page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(base).origin) external.push(request.url()); });
 await page.route('**/*', route => { const url = route.request().url(); return !/^https?:/.test(url) || new URL(url).origin === new URL(base).origin ? route.continue() : route.abort(); });
 /**
  * 条件を検査し成功した項目を記録する。
  *
  * @param {string} name 検査項目名。
  * @param {boolean} condition 判定。
  * @returns {void}
  * @throws {Error} 判定がfalseの場合。
  */
 const ok = (name, condition) => { if (!condition) throw Error(name); checks.push({ name, passed: true }); };
 /**
  * 固定IDの表示を読む。
  *
  * @param {string} id 要素ID。
  * @returns {Promise<string|null>} textContentの取得結果。
  */
 const text = id => page.locator('#' + id).textContent();
 /**
  * 固定IDの要素をクリックする。
  *
  * @param {string} id 要素ID。
  * @returns {Promise<void>} 操作完了。
  */
 const click = id => page.locator('#' + id).click();
 /**
  * タイマーの時/分/秒を入力する。
  *
  * @param {number|string} h 時（通常0〜99、不正値も試験する）。
  * @param {number|string} m 分（通常0〜59）。
  * @param {number|string} s 秒（通常0〜59）。
  * @returns {Promise<void>} 入力完了。
  */
 const time = async (h, m, s) => { for (const [id, value] of [['hours', h], ['minutes', m], ['seconds', s]]) await page.locator('#' + id).fill(String(value)); };
 /**
  * 検索語で候補を絞り都市を選ぶ。
  *
  * @param {string} prefix 基準/比較のピッカーID接頭辞。
  * @param {string} name 候補の都市名。
  * @returns {Promise<void>} 選択完了。
  */
 const chooseCity = async (prefix, name) => { await click(prefix); await page.locator(`#${prefix}-search`).fill(name); await page.locator(`#${prefix}-options [data-name="${name}"]`).click(); };
 const cityNames = { 'America/New_York': 'ニューヨーク', 'Asia/Kolkata': 'コルカタ', 'Asia/Kathmandu': 'カトマンズ', 'Asia/Tokyo': '東京' };
 /**
  * 比較都市を追加する。
  *
  * @param {string} zone タイムゾーン名または都市名。
  * @returns {Promise<void>} 候補選択と追加完了。
  */
 const add = async zone => { await chooseCity('city-select', cityNames[zone] || zone); await click('city-add'); };
 /**
  * 日時差の4入力へ値を設定する。
  *
  * @param {string} startDate 開始日（YYYY-MM-DD）。
  * @param {string} startTime 開始時刻（HH:mm:ss）。
  * @param {string} endDate 終了日（YYYY-MM-DD）。
  * @param {string} endTime 終了時刻（HH:mm:ss）。
  * @returns {Promise<void>} 入力完了。
  */
 const dates = async (startDate, startTime, endDate, endTime) => { for (const [id, value] of [['start-date', startDate], ['start-time', startTime], ['end-date', endDate], ['end-time', endTime]]) await page.locator('#' + id).fill(value); };
 try {
  await page.clock.install({ time: new Date('2026-11-15T00:00:00Z') });
  await page.goto(base + '/time-tools');
  await page.waitForFunction(() => !document.getElementById('time-inputs').disabled);
  ok('four tabs; shared timer starts at 00:05:00', await page.locator('[role=tab]').count() === 4 && await text('timer-display') === '00:05:00');
  await time(0, 0, 0); await click('timer-start'); ok('zero timer rejected', (await text('timer-error')).includes('1秒以上'));
  await time(0, 0, '1.5'); await click('timer-start'); ok('fractional seconds rejected and input retained', (await text('timer-error')).includes('整数') && await page.locator('#seconds').inputValue() === '1.5');
  for (const [h, m, s] of [[100, 0, 0], [0, 60, 0], [0, 0, 60], [-1, 0, 0]]) {
   await time(h, m, s); await click('timer-start'); ok(`timer range rejected ${h}:${m}:${s}`, (await text('timer-error')).includes('0〜99'));
  }
  await page.locator('#hours').fill(''); await click('timer-start'); ok('empty time rejected', (await text('timer-error')).includes('整数'));
  await time(99, 59, 59); await click('timer-start'); ok('99:59:59 accepted and fields locked', await text('timer-display') === '99:59:59' && await page.locator('#hours').isDisabled());
  await page.clock.runFor(1200); ok('long timer ticks', await text('timer-display') === '99:59:58');
  page.once('dialog', dialog => dialog.dismiss()); await click('timer-reset'); ok('cancel timer reset preserves running state', await text('timer-state') === '計測中');
  page.once('dialog', dialog => dialog.accept()); await click('timer-reset');
  await page.locator('[data-minutes="30"]').click(); ok('30 minute preset updates all shared fields', await text('timer-display') === '00:30:00' && await page.locator('#hours').inputValue() === '00' && await page.locator('#seconds').inputValue() === '00');
  await time(1, 0, 1); await click('timer-start'); await page.clock.runFor(1100); ok('timer hour boundary', await text('timer-display') === '01:00:00');
  page.once('dialog', dialog => dialog.accept()); await click('timer-reset');
  await time(0, 0, 2); await click('timer-start'); await page.clock.runFor(500); await click('timer-start');
  const paused = await text('timer-display'); await page.clock.runFor(2500); ok('pause retains remaining time', await text('timer-display') === paused && await text('timer-state') === '一時停止');
  await click('timer-start'); await click('world-tab'); await page.clock.runFor(2000); await click('timer-tab'); ok('completion across tabs', await text('timer-display') === '00:00:00' && await page.locator('#timer-start').isDisabled());
  page.once('dialog', dialog => dialog.accept()); await click('timer-reset');
  await page.locator('#timer-flow').selectOption('pomodoro'); ok('pomodoro shares visible input and display', await text('timer-display') === '00:25:00' && await page.locator('#minutes').isVisible() && await page.locator('#minutes').inputValue() === '25' && await page.locator('#minutes').isDisabled());
  ok('single set of start and reset buttons', await page.locator('#timer-start').count() === 1 && await page.locator('#timer-reset').count() === 1);
  await click('timer-start'); ok('flow locked while counting', await page.locator('#timer-flow').isDisabled());
  await page.clock.fastForward(1500200); ok('focus finishes without automatic rest', await page.locator('#timer-next').isVisible() && await text('timer-state') === '終了しました');
  await click('timer-next'); ok('rest waits for manual start with common five minute input', await text('timer-display') === '00:05:00' && await page.locator('#minutes').inputValue() === '05' && await text('timer-state') === '準備できました');
  await click('timer-start'); await page.clock.fastForward(300200); await click('timer-next'); ok('rest returns to next focus', await text('timer-display') === '00:25:00');
  await click('timer-start'); page.once('dialog', dialog => dialog.accept()); await click('timer-reset'); ok('pomodoro reset returns to focus', await text('timer-phase') === '集中 · 25分' && await text('timer-display') === '00:25:00');
  await page.locator('#timer-flow').selectOption('single'); ok('single timer restores editable fields', await page.locator('#hours').isEnabled());
  await click('watch-tab'); await click('watch-start'); await page.clock.runFor(1200);
  await page.locator('#lap-name').fill('資料確認'); await click('watch-lap'); ok('custom lap name, interval and cumulative time', (await text('laps')).includes('資料確認') && (await text('laps')).includes('合計 00:01.2') && await page.locator('#lap-name').inputValue() === '');
  await click('watch-start'); const watchPaused = await text('watch-display'); await page.clock.runFor(2000); ok('stopwatch excludes paused time', await text('watch-display') === watchPaused && await page.locator('#watch-lap').isDisabled());
  await click('watch-start'); await page.clock.runFor(500); await click('watch-lap'); ok('empty lap name falls back to number and latest first', (await page.locator('#laps li').first().textContent()).startsWith('区間 2'));
  await page.locator('#lap-name').fill('<img src=x onerror=alert(1)>'); await click('watch-lap'); ok('lap name displayed as text, not HTML', await page.locator('#laps img').count() === 0 && (await text('laps')).includes('<img'));
  await page.locator('#lap-name').fill('   '); await click('watch-lap'); ok('whitespace lap name falls back', (await page.locator('#laps li').first().textContent()).startsWith('区間 4'));
  page.once('dialog', dialog => dialog.dismiss()); await click('watch-reset'); ok('cancel reset keeps all laps', await page.locator('#laps li').count() === 4);
  page.once('dialog', dialog => dialog.accept()); await click('watch-reset'); ok('reset clears watch and names', await text('watch-display') === '00:00.0' && (await text('laps')).includes('まだ区間'));
  await click('world-tab'); await page.clock.setSystemTime(new Date('2026-11-15T00:00:00Z')); await page.clock.runFor(1100);
  ok('Tokyo is only initial city and protected base', await page.locator('#world-clocks li').count() === 1 && await page.locator('#world-clocks [data-zone="Asia/Tokyo"] button').count() === 0 && await page.locator('#cities-clear').isDisabled());
  ok('Tokyo digital and analog hour hand agree', await page.locator('#world-clocks [data-zone="Asia/Tokyo"]').evaluate(row => { const [h,m,s] = row.querySelector('time').textContent.split(':').map(Number); const angle = Number(row.querySelector('.hour-hand').style.transform.match(/rotate\(([-.\d]+)/)[1]); return h === 9 && Math.abs(angle - (h % 12 * 30 + m / 2 + s / 120)) < 0.001; }));
  await click('base-city');
  ok('all 50 cities plus UTC offered', await page.locator('#base-city-options [role=option]').count() === 51);
  ok('search is first panel control and focused', await page.locator('#base-city-search').evaluate(el => el === document.activeElement && el.parentElement.firstElementChild.classList.contains('sr-only')));
  await page.locator('#base-city-search').fill('lOnDoN');
  ok('English city name search is case insensitive', await page.locator('#base-city-options [role=option]').count() === 1 && (await page.locator('#base-city-options').textContent()).includes('ロンドン'));
  await page.keyboard.press('Escape');
  ok('Escape preserves base and returns focus', await text('base-city-value') === '東京' && await page.locator('#base-city').evaluate(el => el === document.activeElement));
  await click('city-select'); await page.locator('#city-select-search').fill('India');
  ok('English country search finds Kolkata and Mumbai', await page.locator('#city-select-options [role=option]').count() === 2);
  await page.locator('#city-select-search').fill('オーストラリア');
  ok('Japanese country search finds four Australian cities', await page.locator('#city-select-options [role=option]').count() === 4);
  await page.locator('#city-select-search').fill('存在しない都市');
  await page.keyboard.press('Enter');
  ok('no-match Enter does not select or close', (await text('city-select-count')).includes('該当する都市はありません') && await page.locator('#city-select-panel').isVisible() && await page.locator('#city-add').isDisabled());
  await page.locator('#city-select-search').fill('東京');
  ok('already-added Tokyo unavailable', await page.locator('#city-select-options [data-name="東京"]').getAttribute('aria-disabled') === 'true');
  await page.keyboard.press('Enter');
  ok('Enter cannot pick disabled duplicate', await page.locator('#city-add').isDisabled());
  await page.locator('#city-select-search').fill('India');
  await page.locator('#city-select-search').dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  ok('IME confirmation does not choose a city', await page.locator('#city-select-panel').isVisible() && await page.locator('#city-add').isDisabled());
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  ok('keyboard selects Mumbai after Kolkata', await text('city-select-value') === 'ムンバイ' && await page.locator('#city-select-panel').isHidden());
  await click('city-add');
  ok('keyboard selection can be added', (await page.locator('#world-clocks').textContent()).includes('ムンバイ'));
  await click('city-select');
  ok('reopening resets query and displays every region', await page.locator('#city-select-search').inputValue() === '' && await page.locator('#city-select-options [role=option]').count() === 51 && await page.locator('#city-select-options .picker-region').count() === 6);
  await page.keyboard.press('Tab');
  ok('Tab closes popup and moves forward', await page.locator('#city-select-panel').isHidden() && await page.locator('#city-select-search').evaluate(el => el !== document.activeElement));
  await click('city-select'); await click('base-city');
  ok('only one selection panel remains open', await page.locator('#city-select-panel').isHidden() && await page.locator('#base-city-panel').isVisible());
  await page.locator('#world-panel h2').click(); await page.locator('#show-analog').uncheck();
  ok('outside click closes panel and analog can be hidden', await page.locator('#base-city-panel').isHidden() && await page.locator('#world-clocks .analog').first().isHidden());
  const offTime = await page.locator('#world-clocks time').first().textContent(); await page.clock.runFor(2200);
  ok('digital clock still ticks without analog', await page.locator('#world-clocks time').first().textContent() !== offTime);
  await add('北京'); await add('上海');
  ok('cities sharing timezone stay separately selectable', await page.locator('#world-clocks [data-zone="Asia/Shanghai"]').count() === 2);
  ok('newly added clock respects hidden analog setting', await page.locator('#world-clocks .analog').last().isHidden());
  await page.locator('#show-analog').check();
  ok('all analog clocks can be restored', await page.locator('#world-clocks .analog:visible').count() === 4);
  ok('quick table always has twelve cities below clocks', await page.locator('#quick-cities tr').count() === 12 && await page.locator('#quick-table').evaluate(el => el.getBoundingClientRect().top > document.querySelector('#world-clocks').getBoundingClientRect().bottom));
  ok('Tokyo baseline and difference only shown in quick table', (await text('quick-basis')).includes('基準：東京') && (await page.locator('#quick-cities [data-zone="America/New_York"] .clock-offset').textContent()).trim() === '−14時間');
  ok('quick reference has two columns and no local dates', await page.locator('#quick-table thead th').count() === 2 && await page.locator('#quick-cities time, #quick-cities .clock-date').count() === 0);
  for (const width of [320, 375, 768, 1280]) {
   await page.setViewportSize({ width, height: 900 });
   const positions = await page.locator('#world-clocks .analog').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().left));
   ok(`analog clocks align at ${width}px`, positions.every(left => Math.abs(left - positions[0]) < 1));
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await click('cities-clear');
  ok('bulk removal keeps reference table intact', await page.locator('#world-clocks li').count() === 1 && await page.locator('#quick-cities tr').count() === 12);
  await add('America/New_York'); ok('New York date and relative offset', (await page.locator('#world-clocks [data-zone="America/New_York"] .clock-date').textContent()).includes('11/14') && (await page.locator('#world-clocks [data-zone="America/New_York"] .clock-offset').textContent()).includes('−14時間 / 前日'));
  await click('city-select'); await page.locator('#city-select-search').fill('ニューヨーク'); ok('duplicates disabled', await page.locator('#city-select-options [data-name="ニューヨーク"]').getAttribute('aria-disabled') === 'true'); await page.keyboard.press('Escape');
  await add('Asia/Kolkata'); await add('Asia/Kathmandu'); ok('half and quarter hour timezone differences', (await page.locator('#world-clocks [data-zone="Asia/Kolkata"] .clock-offset').textContent()).includes('−3時間30分') && (await page.locator('#world-clocks [data-zone="Asia/Kathmandu"] .clock-offset').textContent()).includes('−3時間15分'));
  const secondHand = await page.locator('#world-clocks [data-zone="Asia/Tokyo"] .second-hand').evaluate(el => el.style.transform); await page.clock.runFor(2200); ok('analog clock ticks', await page.locator('#world-clocks [data-zone="Asia/Tokyo"] .second-hand').evaluate(el => el.style.transform) !== secondHand);
  await page.getByRole('button', { name: 'コルカタを削除' }).click(); ok('individual comparison removed', await page.locator('#world-clocks [data-zone="Asia/Kolkata"]').count() === 0);
  await chooseCity('base-city', 'ロンドン'); ok('base change reorders and recalculates', await page.locator('#world-clocks li').first().getAttribute('data-zone') === 'Europe/London' && (await page.locator('#world-clocks [data-zone="Asia/Tokyo"] .clock-offset').textContent()).includes('+9時間'));
  await click('cities-clear'); ok('bulk clear keeps selected base, even when not Tokyo', await page.locator('#world-clocks li').count() === 1 && await page.locator('#world-clocks li').first().getAttribute('data-zone') === 'Europe/London');
  await add('Asia/Tokyo'); await page.clock.setSystemTime(new Date('2026-07-01T00:00:00Z')); await page.clock.runFor(1100); ok('summer time changes London to Tokyo difference', (await page.locator('#world-clocks [data-zone="Asia/Tokyo"] .clock-offset').textContent()).includes('+8時間'));
  ok('quick reference recalculates with base and summer time', (await text('quick-basis')).includes('基準：ロンドン') && (await page.locator('#quick-cities [data-zone="Asia/Tokyo"] .clock-offset').textContent()).includes('+8時間'));
  await click('difference-tab'); ok('datetime-only calculator with clear title', await page.locator('#difference-tab').textContent() === '日時の差を計算' && await page.locator('#amount-settings,[name=difference-mode]').count() === 0 && await page.locator('#datetime-settings').isVisible());
  ok('date difference uses Tokyo, independent of browser timezone', (await page.locator('#datetime-settings').textContent()).includes('東京'));
  await dates('2026-11-15', '23:00:00', '2026-11-16', '01:00:00'); await click('difference-calculate'); ok('midnight crossing', await text('difference-value') === '0日 2時間 0分 0秒');
  await page.locator('#end-time').fill('02:00:00'); ok('changed datetime hides stale result', await page.locator('#difference-result').isHidden());
  await dates('2024-02-28', '00:00:00', '2024-03-01', '00:00:00'); await click('difference-calculate'); ok('leap day included', await text('difference-value') === '2日 0時間 0分 0秒');
  await dates('2025-02-28', '00:00:00', '2025-03-01', '00:00:00'); await click('difference-calculate'); ok('non leap February', await text('difference-value') === '1日 0時間 0分 0秒');
  await dates('2026-11-16', '01:00:00', '2026-11-15', '23:00:00'); await click('difference-calculate'); ok('earlier end is negative', await text('difference-value') === '−0日 2時間 0分 0秒');
  await dates('2026-11-15', '00:00:01', '2026-11-15', '00:00:02'); await click('difference-calculate'); ok('second precision', await text('difference-value') === '0日 0時間 0分 1秒');
  await dates('0001-01-01', '00:00:00', '0001-01-02', '00:00:00'); await click('difference-calculate'); ok('year below 100 not interpreted as 1900s', await text('difference-value') === '1日 0時間 0分 0秒');
  await dates('2026-11-15', '00:00:00', '2026-11-15', '00:00:00'); await click('difference-calculate'); ok('same datetime gives zero', await text('difference-value') === '0日 0時間 0分 0秒');
  await page.locator('#start-date').fill(''); await click('difference-calculate'); ok('missing date rejected and old result hidden', (await text('difference-error')).includes('正しい日付') && await page.locator('#difference-result').isHidden());
  await click('world-tab'); await page.locator('#world-tab').focus(); await page.keyboard.press('ArrowLeft'); ok('left arrow wraps to fourth tab', await page.locator('#difference-tab').getAttribute('aria-selected') === 'true'); await page.keyboard.press('ArrowRight'); ok('right arrow wraps to first', await page.locator('#world-tab').getAttribute('aria-selected') === 'true'); await page.keyboard.press('End'); ok('End selects last', await page.locator('#difference-tab').getAttribute('aria-selected') === 'true'); await page.keyboard.press('Home'); ok('Home selects first', await page.locator('#world-tab').getAttribute('aria-selected') === 'true');
  const layouts = [];
  for (const width of [320, 390, 768, 1280]) {
   await page.setViewportSize({ width, height: 900 });
   for (const tab of ['world', 'watch', 'timer', 'difference']) {
    await click(tab + '-tab'); ok(`no horizontal overflow ${width} ${tab}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    layouts.push({ width, tab, cardHeight: await page.locator(`#${tab}-panel .card`).evaluate(el => Math.round(el.getBoundingClientRect().height)) });
   }
   await click('watch-tab'); ok(`lap records directly after controls ${width}`, await page.evaluate(() => document.querySelector('#watch-panel .controls').nextElementSibling.classList.contains('lap-section')));
   await click('world-tab'); ok(`city and digital time share row ${width}`, await page.locator('#world-clocks li').first().evaluate(el => Math.abs(el.querySelector('h3').getBoundingClientRect().top - el.querySelector('time').getBoundingClientRect().top) < 25));
   await page.locator('#show-analog').uncheck(); ok(`no overflow with analog hidden ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   await page.locator('#show-analog').check();
   await click('base-city'); ok(`search popup stays in viewport ${width}`, await page.locator('#base-city-panel').evaluate(el => el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth));
   await page.locator('#base-city-search').fill('new'); ok(`filtered popup fits ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await page.keyboard.press('Escape');
   await click('timer-tab'); ok(`timer controls fit first viewport ${width}`, await page.locator('#timer-start').evaluate(el => el.getBoundingClientRect().bottom < innerHeight));
  }
  // 共通ナビ追加とスコープ付きCSSが既存ページの幅や初期化に影響しないことを確認する。
  for (const url of ['/', '/calendar', '/date-tools', '/unit-converter', '/text-tools', '/password-generator-browser', '/password-generator/generate']) {
   await page.goto(base + url);
   for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    ok(`existing page fits ${url} ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   }
  }
  await page.goto(base + '/time-tools'); await page.waitForFunction(() => !document.getElementById('time-inputs').disabled);
  ok('advertisement follows tool and appears once', await page.locator('.ad-slot').count() === 1 && await page.evaluate(() => Boolean(document.querySelector('#time-tools').compareDocumentPosition(document.querySelector('.ad-slot')) & Node.DOCUMENT_POSITION_FOLLOWING)));
  await click('watch-tab'); await click('watch-start'); await page.locator('#lap-name').fill('離脱時の記録'); await click('watch-lap');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  ok('pagehide clears lap names and records', await page.locator('#lap-name').inputValue() === '' && await page.locator('#laps li').count() === 0);
  ok('pagehide stops measurements and disables stale page', await text('watch-state') === '計測前' && await text('timer-state') === '準備できました' && await page.locator('#time-inputs').evaluate(el => el.disabled));
  await Promise.all([page.waitForNavigation(), page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))]);
  await page.waitForFunction(() => !document.getElementById('time-inputs').disabled);
  ok('history cache restoration reloads fresh defaults', await text('timer-display') === '00:05:00' && await page.locator('#show-analog').isChecked() && await page.locator('#world-clocks li').count() === 1);
  await click('watch-tab'); await page.locator('#lap-name').fill('再読込前'); await page.reload();
  await page.waitForFunction(() => !document.getElementById('time-inputs').disabled);
  ok('reload does not restore inputs', await page.locator('#lap-name').inputValue() === '' && await text('watch-display') === '00:00.0');
  ok('no persistent storage used', await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0));
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage(); await staticPage.goto(base + '/time-tools');
  ok('no JavaScript keeps all tool controls disabled', await staticPage.locator('#time-inputs').evaluate(el => el.disabled) && await staticPage.locator('#timer-start').isDisabled());
  await noJs.close();
  ok('no browser errors', errors.length === 0); ok('no external requests', external.length === 0);
  const report = { checked_at: new Date().toISOString(), browser: browser.version(), revision: 'Searchable 50 cities plus UTC, 12-city current offset table, optional analog display, datetime-only calculator; approved timer and stopwatch retained', checks, layouts, errors, external_requests: external, notes: ['No PNG generated.', 'Laravel integration checked; audio audibility, actual device sleep, physical devices, other browsers and full 99-hour elapsed run unverified.'] };
  const output = path.resolve(process.env.TEST_ARTIFACT_DIR || 'test-results/browser/time-tools');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: checks.length, errors, external, layouts }));
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
