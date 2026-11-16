/**
 * @file 時間ツールのブラウザー処理。LaravelはGET画面を提供し、都市検索・計測・日時差をこのモジュールが担当する。
 * 計測値/都市選択はメモリーで保持する。背景タブ/スリープ中の確実な音通知を保証しない。
 */
/**
 * @typedef {Object} PreviewCity
 * @property {string} id 選択用の都市ID。
 * @property {string} name 日本語の都市名。
 * @property {string} zone IANAタイムゾーン名、またはUTC。
 * @property {string} english 英語の都市名と検索別名。
 * @property {string} country 日本語の国名。
 * @property {string} countryEnglish 国名の検索別名。
 * @property {string} region 候補表示の地域区分。
 */
/**
 * @typedef {{year: number, month: number, day: number, hour: number, minute: number, second: number}} WallParts 都市の暦上の日時。月は1〜12。
 */
'use strict';
(() => {
 // 共通Vite入口から全画面で読み込むため、時間ツールの画面だけを初期化する。
 if (!document.getElementById('time-tools')) return;
 /**
  * 固定IDから要素を参照する。
  *
  * @param {string} id 要素ID。
  * @returns {HTMLElement|null} 対応要素。
  */
 const $ = id => document.getElementById(id);
 /**
  * 時分秒を最低2桁にそろえる。
  *
  * @param {number} value 整数値。
  * @returns {string} ゼロ埋め文字列。
  */
 const pad = value => String(value).padStart(2, '0');
 /**
  * タイマーの残り時間を秒単位で切り上げて表示する。
  *
  * @param {number} ms 残り時間（ミリ秒）。負なら0扱い。
  * @returns {string} 時:分:秒の表示。
  */
 const format = ms => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
 };
 /**
  * ストップウォッチの経過時間を0.1秒単位で切り捨て表示する。
  *
  * @param {number} ms 経過時間（ミリ秒）。
  * @returns {string} 分:秒.0.1秒の表示。
  */
 const watchFormat = ms => {
  const tenth = Math.floor(ms / 100);
  return `${pad(Math.floor(tenth / 600))}:${pad(Math.floor(tenth / 10) % 60)}.${tenth % 10}`;
 };
 /**
  * 文字列が変わった場合だけDOMの表示を更新する。
  *
  * @param {string} id 表示先ID。
  * @param {string} text 新しい文。
  * @returns {void}
  */
 function message(id, text) { if ($(id).textContent !== text) $(id).textContent = text; }
 let flow = 'single', phase = 'focus', state = 'ready', duration = 300000, remaining = duration, deadline = 0, audio;
 let watchRunning = false, watchElapsed = 0, watchAnchor = 0, lastLap = 0, lapCount = 0;
 /**
  * 終了音を再生し、失敗した場合は画面に案内する。
  *
  * @returns {void} 660Hz/約0.45秒の音を開始するが、実際の可聴性は保証しない。
  */
 function beep() {
  try {
   audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume();
   const oscillator = audio.createOscillator(), gain = audio.createGain();
   oscillator.connect(gain); gain.connect(audio.destination); oscillator.frequency.value = 660;
   gain.gain.setValueAtTime(.12, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .45);
   oscillator.start(); oscillator.stop(audio.currentTime + .45);
  } catch { message('timer-message', '音を再生できませんでした。画面で終了を確認してください。'); }
 }
 /**
  * 別タブで動作中の計測を共通案内へ表示する。
  *
  * @returns {void}
  */
 function background() {
  const parts = [];
  if (state === 'running' || state === 'paused') parts.push(`タイマー：${state === 'running' ? '計測中' : '一時停止'}`);
  if (watchRunning) parts.push('ストップウォッチ：計測中');
  message('background-state', parts.join(' / '));
 }
 /**
  * ミリ秒の設定時間を時/分/秒の入力欄へ分解する。
  *
  * @param {number} ms 設定する時間（ミリ秒）。
  * @returns {void}
  */
 function setTimeFields(ms) {
  const seconds = Math.floor(ms / 1000);
  $('hours').value = pad(Math.floor(seconds / 3600)); $('minutes').value = pad(Math.floor(seconds / 60) % 60); $('seconds').value = pad(seconds % 60);
 }
 /**
  * タイマー状態から表示、操作可否、進捗率を描画する。
  *
  * @returns {void}
  */
 function renderTimer() {
  message('timer-display', format(remaining));
  message('timer-state', { ready: '準備できました', running: '計測中', paused: '一時停止', finished: '終了しました' }[state]);
  message('timer-start', state === 'running' ? '一時停止' : state === 'paused' ? '再開' : '開始');
  $('timer-start').disabled = state === 'finished';
  $('timer-next').hidden = flow !== 'pomodoro' || state !== 'finished';
  message('timer-next', phase === 'focus' ? '5分の休憩へ進む' : '次の25分の集中へ進む');
  $('timer-phase').hidden = flow !== 'pomodoro'; message('timer-phase', phase === 'focus' ? '集中 · 25分' : '休憩 · 5分');
  $('pomodoro-help').hidden = flow !== 'pomodoro';
  $('timer-progress').style.width = `${duration ? Math.min(100, Math.max(0, 100 * (1 - remaining / duration))) : 0}%`;
  $('timer-flow').disabled = state !== 'ready';
  document.querySelectorAll('.duration input,[data-minutes]').forEach(el => el.disabled = state !== 'ready' || flow === 'pomodoro');
  background();
 }
 /**
  * 時/分/秒の入力を検証して計測時間へ変換する。
  *
  * @returns {number|null} 1秒〜99時間59分59秒のミリ秒値。不正なら案内してnull。
  */
 function readDuration() {
  const values = ['hours', 'minutes', 'seconds'].map(id => $(id).value);
  if (values.some(v => !/^\d{1,2}$/.test(v)) || Number(values[0]) > 99 || Number(values[1]) > 59 || Number(values[2]) > 59) {
   message('timer-error', '時は0〜99、分・秒は0〜59の整数で入力してください。'); return null;
  }
  const value = (Number(values[0]) * 3600 + Number(values[1]) * 60 + Number(values[2])) * 1000;
  if (!value) { message('timer-error', '1秒以上の時間を指定してください。'); return null; }
  message('timer-error', ''); return value;
 }
 /**
  * 単発タイマーが準備中の場合だけ入力の時間を表示へ反映する。
  *
  * @returns {void}
  */
 function updateDuration() {
  if (flow !== 'single' || state !== 'ready') return;
  const value = readDuration();
  if (value !== null) { duration = remaining = value; renderTimer(); }
  else { message('timer-display', '—'); }
 }
 for (const id of ['hours', 'minutes', 'seconds']) {
  $(id).oninput = updateDuration;
  $(id).onblur = () => { if (/^\d{1,2}$/.test($(id).value)) $(id).value = pad(Number($(id).value)); };
 }
 document.querySelectorAll('[data-minutes]').forEach(el => el.onclick = () => { setTimeFields(Number(el.dataset.minutes) * 60000); updateDuration(); });
 $('timer-flow').onchange = () => {
  flow = $('timer-flow').value; phase = 'focus'; duration = remaining = flow === 'pomodoro' ? 1500000 : 300000;
  setTimeFields(duration); message('timer-error', ''); message('timer-message', ''); renderTimer();
 };
 /**
  * 残りを0にして終了状態へ移し、選択に応じて音を鳴らす。
  *
  * @returns {void} 次の集中/休憩は自動開始しない。
  */
 function finishTimer() {
  remaining = 0; state = 'finished';
  message('timer-message', flow === 'pomodoro' ? (phase === 'focus' ? '25分の集中が終わりました。' : '5分の休憩が終わりました。') : '設定した時間が終わりました。');
  if ($('sound').checked) beep();
 }
 // 残り時間は表示の更新回数ではなく終了予定時刻との差で計算する。
 // 開始/停止操作は終了予定時刻と残り時間を切り替え、入力ロックと表示を同期する。
 $('timer-form').onsubmit = event => {
  event.preventDefault(); if (state === 'finished') return;
  if (state === 'running') {
   remaining = Math.max(0, deadline - Date.now());
   if (remaining === 0) finishTimer(); else state = 'paused';
  } else {
   if (state === 'ready' && flow === 'single') { const value = readDuration(); if (value === null) return; duration = remaining = value; setTimeFields(value); }
   deadline = Date.now() + remaining; state = 'running'; message('timer-message', '');
   if ($('sound').checked) { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch { /* 音の準備が失敗しても、画面の終了表示は続ける。 */ } }
  }
  renderTimer();
 };
 // 確認後に計測状態を準備へ戻し、設定した長さからやり直せるようにする。
 $('timer-reset').onclick = () => {
  if (state !== 'ready' && !confirm('計測を終了してリセットしますか？')) return;
  state = 'ready'; phase = 'focus'; if (flow === 'pomodoro') duration = 1500000;
  remaining = duration; setTimeFields(duration); message('timer-message', ''); message('timer-error', ''); renderTimer();
 };
 $('timer-next').onclick = () => {
  if (flow !== 'pomodoro' || state !== 'finished') return;
  phase = phase === 'focus' ? 'break' : 'focus'; duration = remaining = phase === 'focus' ? 1500000 : 300000;
  state = 'ready'; setTimeFields(duration); message('timer-message', '開始を押すと次の時間を計測します。'); renderTimer();
 };
 $('sound-test').onclick = beep;
 /**
  * 停止時間を除いた実際の経過時間を求める。
  *
  * @returns {number} 停止時点の累計と再開後の差分を足したミリ秒値。
  */
 function elapsed() { return watchElapsed + (watchRunning ? performance.now() - watchAnchor : 0); }
 /**
  * ストップウォッチの表示と操作可否を状態に合わせる。
  *
  * @returns {void}
  */
 function renderWatch() {
  message('watch-display', watchFormat(elapsed())); message('watch-state', watchRunning ? '計測中' : watchElapsed ? '一時停止' : '計測前');
  message('watch-start', watchRunning ? '一時停止' : watchElapsed ? '再開' : '開始'); $('watch-lap').disabled = !watchRunning; background();
 }
 // 停止時の累計を保持し、再開時の基点だけを更新して停止中の時間を除く。
 $('watch-start').onclick = () => {
  if (watchRunning) { watchElapsed = elapsed(); watchRunning = false; } else { watchAnchor = performance.now(); watchRunning = true; }
  message('watch-message', ''); renderWatch();
 };
 // 記録時点の区間名と経過時間を確定し、文字として表示してHTML解釈を防ぐ。
 $('watch-lap').onclick = () => {
  if (!watchRunning) return;
  const total = elapsed(), part = total - lastLap; lastLap = total; lapCount++;
  if (lapCount === 1) $('laps').replaceChildren();
  const li = document.createElement('li'), label = document.createElement('span'), time = document.createElement('strong'), meta = document.createElement('span');
  const name = $('lap-name').value.trim().slice(0, 40) || `区間 ${lapCount}`;
  label.className = 'lap-label'; label.textContent = name; time.textContent = watchFormat(part); meta.textContent = `合計 ${watchFormat(total)}`;
  li.append(label, time, meta); $('laps').prepend(li); $('lap-name').value = ''; message('watch-message', `${name}を記録しました。`);
 };
 $('watch-reset').onclick = () => {
  if ((watchRunning || watchElapsed || lapCount) && !confirm('計測時間と区間の記録をリセットしますか？')) return;
  watchRunning = false; watchElapsed = lastLap = lapCount = 0; $('lap-name').value = '';
  const li = document.createElement('li'); li.className = 'muted'; li.textContent = 'まだ区間の記録はありません。'; $('laps').replaceChildren(li);
  message('watch-message', ''); renderWatch();
 };
 const cities = [
  ['東京','Asia/Tokyo','Tokyo','日本','Japan','アジア・中東'],
  ['ソウル','Asia/Seoul','Seoul','韓国','South Korea','アジア・中東'],
  ['北京','Asia/Shanghai','Beijing','中国','China','アジア・中東'],
  ['上海','Asia/Shanghai','Shanghai','中国','China','アジア・中東'],
  ['香港','Asia/Hong_Kong','Hong Kong','中国','China','アジア・中東'],
  ['台北','Asia/Taipei','Taipei','台湾','Taiwan','アジア・中東'],
  ['シンガポール','Asia/Singapore','Singapore','シンガポール','Singapore','アジア・中東'],
  ['バンコク','Asia/Bangkok','Bangkok','タイ','Thailand','アジア・中東'],
  ['ハノイ','Asia/Ho_Chi_Minh','Hanoi','ベトナム','Vietnam','アジア・中東'],
  ['ジャカルタ','Asia/Jakarta','Jakarta','インドネシア','Indonesia','アジア・中東'],
  ['クアラルンプール','Asia/Kuala_Lumpur','Kuala Lumpur','マレーシア','Malaysia','アジア・中東'],
  ['マニラ','Asia/Manila','Manila','フィリピン','Philippines','アジア・中東'],
  ['コルカタ','Asia/Kolkata','Kolkata','インド','India','アジア・中東'],
  ['ムンバイ','Asia/Kolkata','Mumbai','インド','India','アジア・中東'],
  ['カトマンズ','Asia/Kathmandu','Kathmandu','ネパール','Nepal','アジア・中東'],
  ['ダッカ','Asia/Dhaka','Dhaka','バングラデシュ','Bangladesh','アジア・中東'],
  ['ドバイ','Asia/Dubai','Dubai','アラブ首長国連邦','United Arab Emirates UAE','アジア・中東'],
  ['リヤド','Asia/Riyadh','Riyadh','サウジアラビア','Saudi Arabia','アジア・中東'],
  ['エルサレム','Asia/Jerusalem','Jerusalem','イスラエル','Israel','アジア・中東'],
  ['カラチ','Asia/Karachi','Karachi','パキスタン','Pakistan','アジア・中東'],
  ['ロンドン','Europe/London','London','イギリス','United Kingdom UK','ヨーロッパ'],
  ['パリ','Europe/Paris','Paris','フランス','France','ヨーロッパ'],
  ['ベルリン','Europe/Berlin','Berlin','ドイツ','Germany','ヨーロッパ'],
  ['ローマ','Europe/Rome','Rome','イタリア','Italy','ヨーロッパ'],
  ['マドリード','Europe/Madrid','Madrid','スペイン','Spain','ヨーロッパ'],
  ['アムステルダム','Europe/Amsterdam','Amsterdam','オランダ','Netherlands','ヨーロッパ'],
  ['チューリッヒ','Europe/Zurich','Zurich','スイス','Switzerland','ヨーロッパ'],
  ['ストックホルム','Europe/Stockholm','Stockholm','スウェーデン','Sweden','ヨーロッパ'],
  ['アテネ','Europe/Athens','Athens','ギリシャ','Greece','ヨーロッパ'],
  ['イスタンブール','Europe/Istanbul','Istanbul','トルコ','Turkey Türkiye','ヨーロッパ'],
  ['モスクワ','Europe/Moscow','Moscow','ロシア','Russia','ヨーロッパ'],
  ['ニューヨーク','America/New_York','New York','アメリカ','United States USA','アメリカ'],
  ['ロサンゼルス','America/Los_Angeles','Los Angeles','アメリカ','United States USA','アメリカ'],
  ['シカゴ','America/Chicago','Chicago','アメリカ','United States USA','アメリカ'],
  ['デンバー','America/Denver','Denver','アメリカ','United States USA','アメリカ'],
  ['バンクーバー','America/Vancouver','Vancouver','カナダ','Canada','アメリカ'],
  ['トロント','America/Toronto','Toronto','カナダ','Canada','アメリカ'],
  ['サンパウロ','America/Sao_Paulo','São Paulo Sao Paulo','ブラジル','Brazil','アメリカ'],
  ['メキシコシティ','America/Mexico_City','Mexico City','メキシコ','Mexico','アメリカ'],
  ['ブエノスアイレス','America/Argentina/Buenos_Aires','Buenos Aires','アルゼンチン','Argentina','アメリカ'],
  ['シドニー','Australia/Sydney','Sydney','オーストラリア','Australia','オセアニア・太平洋'],
  ['メルボルン','Australia/Melbourne','Melbourne','オーストラリア','Australia','オセアニア・太平洋'],
  ['ブリスベン','Australia/Brisbane','Brisbane','オーストラリア','Australia','オセアニア・太平洋'],
  ['パース','Australia/Perth','Perth','オーストラリア','Australia','オセアニア・太平洋'],
  ['オークランド','Pacific/Auckland','Auckland','ニュージーランド','New Zealand','オセアニア・太平洋'],
  ['ホノルル','Pacific/Honolulu','Honolulu','アメリカ','United States USA','オセアニア・太平洋'],
  ['カイロ','Africa/Cairo','Cairo','エジプト','Egypt','アフリカ'],
  ['ヨハネスブルク','Africa/Johannesburg','Johannesburg','南アフリカ','South Africa','アフリカ'],
  ['ナイロビ','Africa/Nairobi','Nairobi','ケニア','Kenya','アフリカ'],
  ['ラゴス','Africa/Lagos','Lagos','ナイジェリア','Nigeria','アフリカ'],
  ['UTC','UTC','UTC','協定世界時','Coordinated Universal Time','その他']
 ].map(([name,zone,english,country,countryEnglish,region],index) => ({ id: `city-${index}`, name, zone, english, country, countryEnglish, region }));
 /**
  * 固定候補から都市IDを検索する。
  *
  * @param {string} id 都市ID。
  * @returns {PreviewCity|undefined} 該当都市。
  */
 const cityById = id => cities.find(city => city.id === id);
 let baseCity = cities[0].id, selected = [baseCity], pendingCity = null;
 const formatters = new Map(cities.map(city => [city.zone, {
  time: new Intl.DateTimeFormat('ja-JP', { timeZone: city.zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }),
  date: new Intl.DateTimeFormat('ja-JP', { timeZone: city.zone, month: 'numeric', day: 'numeric', weekday: 'short' }),
  parts: new Intl.DateTimeFormat('en-GB', { timeZone: city.zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
 }]));
 const pickers = [];
 /**
  * 都市/国名検索の表記ゆれと英字の大小をそろえる。
  *
  * @param {string} value 検索語または候補文字列。
  * @returns {string} NFKC/前後空白除去/小文字化した文字列。
  */
 const normalize = value => value.normalize('NFKC').trim().toLowerCase();
 /**
  * 検索とキーボード操作に対応した都市ピッカーを初期化する。
  *
  * @param {string} prefix base-cityまたはcity-selectの要素ID接頭辞。
  * @param {boolean} isBase 基準都市用ならtrue、比較都市の追加用ならfalse。
  * @returns {{close: function(boolean=): void, filter: function(): void, wrapper: HTMLElement}} 開閉/再検索の操作とラッパー要素。
  */
 function cityPicker(prefix, isBase) {
  const wrapper = $(`${prefix}-picker`), trigger = $(prefix), panel = $(`${prefix}-panel`), search = $(`${prefix}-search`), list = $(`${prefix}-options`);
  let matches = [], active = null;
  /**
   * 比較都市として追加済みなら選択不可にする。
   *
   * @param {PreviewCity} city 候補都市。
   * @returns {boolean} 基準用では常にfalse。比較用では追加済みの判定。
   */
  const disabled = city => !isBase && selected.includes(city.id);
  /**
   * キー操作中の候補を強調し、支援技術へ通知する。
   *
   * @param {string|null} id 都市ID。nullなら強調を解除。
   * @returns {void}
   */
  function markActive(id) {
   active = id;
   for (const option of list.querySelectorAll('[role=option]')) option.classList.toggle('is-active', option.dataset.city === id);
   const option = id && list.querySelector(`[data-city="${id}"]`);
   if (option) { search.setAttribute('aria-activedescendant', option.id); option.scrollIntoView({ block: 'nearest' }); }
   else search.removeAttribute('aria-activedescendant');
  }
  /**
   * 候補パネルを閉じ、必要ならトリガーへフォーカスを戻す。
   *
   * @param {boolean} [restoreFocus=false] トリガーへ戻すか。
   * @returns {void}
   */
  function close(restoreFocus = false) {
   panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); search.setAttribute('aria-expanded', 'false'); search.removeAttribute('aria-activedescendant');
   if (restoreFocus) trigger.focus();
  }
  /**
   * 候補を確定して基準都市または追加待ち都市を更新する。
   *
   * @param {string} id 選ぶ都市ID。不正/選択不可なら何もしない。
   * @returns {void}
   */
  // 選択確定時だけ基準/追加候補を変え、未確定の検索では時計を変えない。
  function choose(id) {
   const city = cityById(id); if (!city || disabled(city)) return;
   close(true);
   if (isBase) { baseCity = id; if (!selected.includes(id)) selected.push(id); message('city-message', '基準都市を変更しました。'); renderCities(); }
   else { pendingCity = id; message(`${prefix}-value`, city.name); $('city-add').disabled = false; }
  }
  /**
   * 都市名/英名/国名で絞り、地域見出しと候補DOMを更新する。
   *
   * @returns {void}
   */
  function filter() {
   const query = normalize(search.value);
   matches = cities.filter(city => normalize(`${city.name} ${city.english} ${city.country} ${city.countryEnglish}`).includes(query));
   list.replaceChildren(); let region = null;
   for (const city of matches) {
    if (region !== city.region) { region = city.region; const heading = document.createElement('div'); heading.className = 'picker-region'; heading.setAttribute('role', 'presentation'); heading.textContent = region; list.append(heading); }
    const option = document.createElement('div'); option.id = `${prefix}-option-${city.id}`; option.dataset.city = city.id; option.dataset.name = city.name; option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(city.id === (isBase ? baseCity : pendingCity))); option.setAttribute('aria-disabled', String(disabled(city))); option.className = 'picker-option';
    const name = document.createElement('span'), meta = document.createElement('small'); name.textContent = `${city.name}${disabled(city) ? '（追加済み）' : ''}`; meta.textContent = `${city.english} / ${city.country}`;
    option.append(name, meta); option.onmousedown = event => event.preventDefault(); option.onclick = () => choose(city.id); list.append(option);
   }
   message(`${prefix}-count`, matches.length ? `${matches.length}件の候補` : '該当する都市はありません。');
   const enabled = matches.filter(city => !disabled(city)); markActive(enabled.find(city => city.id === (isBase ? baseCity : pendingCity))?.id || enabled[0]?.id || null);
  }
  /**
   * ほかの候補を閉じて、この候補一覧を開く。
   *
   * @param {boolean} [last=false] trueなら最後の有効候補を強調する。
   * @returns {void}
   */
  function open(last = false) {
   for (const picker of pickers) picker.close();
   panel.hidden = false; trigger.setAttribute('aria-expanded', 'true'); search.setAttribute('aria-expanded', 'true'); search.value = ''; filter(); search.focus();
   if (last) markActive(matches.filter(city => !disabled(city)).at(-1)?.id || null);
  }
  trigger.onclick = () => { if (panel.hidden) open(); else close(); };
  trigger.onkeydown = event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(event.key === 'ArrowUp'); } };
  search.oninput = filter;
  search.onkeydown = event => {
   if (event.isComposing || event.keyCode === 229) return;
   if (event.key === 'Tab') { close(true); return; }
   if (event.key === 'Escape') { event.preventDefault(); close(true); }
   if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault(); const enabled = matches.filter(city => !disabled(city)), index = enabled.findIndex(city => city.id === active);
    if (enabled.length) markActive(enabled[(index + (event.key === 'ArrowDown' ? 1 : enabled.length - 1)) % enabled.length].id);
   }
   if (event.key === 'Enter') { event.preventDefault(); if (active) choose(active); }
  };
  document.addEventListener('pointerdown', event => { if (!wrapper.contains(event.target)) close(); });
  document.addEventListener('focusin', event => { if (!wrapper.contains(event.target)) close(); });
  const picker = { close, filter, wrapper }; pickers.push(picker); return picker;
 }
 cityPicker('base-city', true); cityPicker('city-select', false);
 /**
  * 同じ瞬間を指定都市の暦上の日時へ分解する。
  *
  * @param {string} zone 定義済み都市のタイムゾーン。
  * @param {Date} date 対象の瞬間。
  * @returns {WallParts} 都市の年月日時分秒。
  */
 function wallParts(zone, date) {
  const parts = {}; formatters.get(zone).parts.formatToParts(date).forEach(part => { if (part.type !== 'literal') parts[part.type] = Number(part.value); }); return parts;
 }
 /**
  * 暦上の日時を比較用のUTC数値へ並べ直す。
  *
  * @param {WallParts} parts 都市の日時要素。
  * @returns {number} 比較用のミリ秒値。実際の都市時刻のUTC変換ではない。
  */
 function wallStamp(parts) { return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second); }
 /**
  * 文字盤と針を持つアナログ時計のSVGを作る。
  *
  * @returns {SVGSVGElement} 針の角度はupdateClocksで更新するSVG。
  */
 function analogClock() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 64 64'); svg.classList.add('analog'); svg.setAttribute('aria-hidden', 'true');
  /**
   * アナログ時計内へSVG要素を追加する。
   *
   * @param {string} tag SVGタグ名。
   * @param {Object<string, string|number>} attrs 設定する属性の辞書。
   * @returns {SVGElement} 追加した要素。
   */
  function element(tag, attrs) { const el = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value); svg.append(el); return el; }
  element('circle', { cx: 32, cy: 32, r: 30, class: 'face' });
  for (let n = 0; n < 12; n++) element('line', { x1: 32, y1: 4, x2: 32, y2: n % 3 ? 7 : 9, transform: `rotate(${n * 30} 32 32)`, class: 'tick' });
  for (const [kind, y] of [['hour', 17], ['minute', 11], ['second', 7]]) element('line', { x1: 32, y1: 32, x2: 32, y2: y, class: `hand ${kind}-hand` });
  element('circle', { cx: 32, cy: 32, r: 2, fill: '#17313a' }); return svg;
 }
 /**
  * 同じ瞬間の基準都市との時差と日付差を表示する。
  *
  * @param {string} zone 表示対象のタイムゾーン。
  * @param {Date} now 比較する瞬間。
  * @param {string} reference 基準のタイムゾーン。
  * @returns {string} 符号つき時間/分と前日/翌日の注記。夏時間はIntlに従う。
  */
 function offsetText(zone, now, reference) {
  const parts = wallParts(zone, now), ref = wallParts(reference, now);
  const minuteDiff = Math.round((wallStamp(parts) - wallStamp(ref)) / 60000), abs = Math.abs(minuteDiff);
  const dayDiff = Math.round((Date.UTC(parts.year, parts.month - 1, parts.day) - Date.UTC(ref.year, ref.month - 1, ref.day)) / 86400000);
  return `${minuteDiff < 0 ? '−' : '+'}${Math.floor(abs / 60)}時間${abs % 60 ? `${abs % 60}分` : ''}${dayDiff ? ` / ${dayDiff < 0 ? '前日' : '翌日'}` : ''}`;
 }
 /**
  * 選択都市と早見表のデジタル/アナログ/基準との差を同じ瞬間で更新する。
  *
  * @returns {void}
  */
 function updateClocks() {
  const now = new Date(), base = cityById(baseCity);
  document.querySelectorAll('[data-zone]').forEach(row => {
   if (row.dataset.quickCity) {
    row.querySelector('.clock-offset').textContent = offsetText(row.dataset.zone, now, base.zone).split(' / ')[0];
    return;
   }
   const zone = row.dataset.zone, formatter = formatters.get(zone), parts = wallParts(zone, now), time = row.querySelector('time');
   time.textContent = formatter.time.format(now); time.dateTime = now.toISOString(); row.querySelector('.clock-date').textContent = formatter.date.format(now);
   row.querySelector('.clock-offset').textContent = row.dataset.city === baseCity || row.dataset.quickCity === baseCity ? '基準の時刻' : offsetText(zone, now, base.zone);
   for (const [kind, angle] of [['hour', (parts.hour % 12) * 30 + parts.minute / 2 + parts.second / 120], ['minute', parts.minute * 6 + parts.second / 10], ['second', parts.second * 6]]) {
    const hand = row.querySelector(`.${kind}-hand`); if (hand) hand.style.transform = `rotate(${angle}deg)`;
   }
  });
  message('quick-basis', `基準：${base.name}`);
 }
 /**
  * 基準都市を先頭に世界時計を再描画し、削除/追加可否とピッカーを更新する。
  *
  * @returns {void}
  */
 function renderCities() {
  $('world-clocks').replaceChildren();
  for (const id of [baseCity, ...selected.filter(value => value !== baseCity)]) {
   const city = cityById(id), li = document.createElement('li'), info = document.createElement('div'), heading = document.createElement('h3'), time = document.createElement('time'), date = document.createElement('p'), offset = document.createElement('p');
   li.dataset.city = id; li.dataset.zone = city.zone; li.classList.toggle('is-base', id === baseCity); heading.textContent = city.name; date.className = 'clock-date'; offset.className = 'clock-offset'; info.append(heading, date); li.append(analogClock(), info, time, offset);
   if (id === baseCity) { const badge = document.createElement('span'); badge.className = 'base-badge'; badge.textContent = '基準'; li.append(badge); }
   else { const remove = document.createElement('button'); remove.textContent = '削除'; remove.setAttribute('aria-label', `${city.name}を削除`); remove.onclick = () => { selected = selected.filter(value => value !== id); message('city-message', `${city.name}を削除しました。`); renderCities(); $('city-select').focus(); }; li.append(remove); }
   $('world-clocks').append(li);
  }
  message('base-city-value', cityById(baseCity).name);
  if (selected.includes(pendingCity)) pendingCity = null;
  message('city-select-value', pendingCity ? cityById(pendingCity).name : '都市を選ぶ');
  $('city-add').disabled = !pendingCity; $('cities-clear').disabled = selected.length === 1;
  for (const picker of pickers) if (!picker.wrapper.querySelector('.picker-panel').hidden) picker.filter();
  updateClocks();
 }
 // 選択した都市を重複なく追加し、時計と候補の操作可否を再描画する。
 $('city-form').onsubmit = event => {
  event.preventDefault(); if (!pendingCity || selected.includes(pendingCity)) return;
  selected.push(pendingCity); pendingCity = null; message('city-message', '都市を追加しました。'); renderCities(); $('city-select').focus();
 };
 $('cities-clear').onclick = () => { selected = [baseCity]; message('city-message', '基準都市を残し、比較都市をすべて削除しました。'); renderCities(); };
 $('show-analog').onchange = () => $('world-clocks').classList.toggle('without-analog', !$('show-analog').checked);
 const quickNames = ['東京','香港','シンガポール','ドバイ','ロンドン','パリ','ニューヨーク','ロサンゼルス','サンパウロ','ヨハネスブルク','シドニー','オークランド'];
 for (const name of quickNames) {
  const city = cities.find(value => value.name === name), row = document.createElement('tr'), label = document.createElement('th'), offset = document.createElement('td');
  row.dataset.zone = city.zone; row.dataset.quickCity = city.id; label.scope = 'row'; label.textContent = name; offset.className = 'clock-offset'; row.append(label, offset); $('quick-cities').append(row);
 }
 // ブラウザーのタイムゾーンによらず、初期入力は日本時間の今日にする。
 const today = wallParts('Asia/Tokyo', new Date());
 $('start-date').value = $('end-date').value = `${today.year}-${pad(today.month)}-${pad(today.day)}`;
 /**
  * 日時入力変更後の古い結果とエラーを隠す。
  *
  * @returns {void}
  */
 function invalidateDifference() { $('difference-result').hidden = true; message('difference-error', ''); }
 document.querySelectorAll('#datetime-settings input').forEach(input => input.oninput = invalidateDifference);
 /**
  * 東京の日時入力を検証し、UTCのUnix秒へ変換する。
  *
  * @param {string} prefix startまたはendの入力ID接頭辞。
  * @returns {number} 指定した東京日時のUnix時刻（秒）。
  * @throws {Error} 書式/実在日/時刻/年1〜9999の範囲に違反する場合。
  */
 function tokyoDateTime(prefix) {
  const date = $(`${prefix}-date`).value, time = $(`${prefix}-time`).value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date), clock = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!match || !clock) throw Error('開始・終了の正しい日付と時刻を入力してください。');
  const [, y, m, d] = match.map(Number), hour = Number(clock[1]), minute = Number(clock[2]), second = Number(clock[3] || 0);
  if (y < 1 || y > 9999 || hour > 23 || minute > 59 || second > 59) throw Error('日時の入力範囲を確認してください。');
  const civil = new Date(0); civil.setUTCFullYear(y, m - 1, d); civil.setUTCHours(hour, minute, second, 0);
  if (civil.getUTCFullYear() !== y || civil.getUTCMonth() !== m - 1 || civil.getUTCDate() !== d) throw Error('実在する日付を入力してください。');
  return civil.getTime() / 1000 - 9 * 3600;
 }
 /**
  * 符号付き秒数を日/時間/分/秒へ分解する。
  *
  * @param {number} value 日時差（秒、負数も可）。
  * @returns {string} 符号を含む期間の表示。
  */
 function durationText(value) {
  const abs = Math.abs(value), days = Math.floor(abs / 86400), hours = Math.floor(abs / 3600) % 24, minutes = Math.floor(abs / 60) % 60, seconds = abs % 60;
  return `${value < 0 ? '−' : ''}${days}日 ${hours}時間 ${minutes}分 ${seconds}秒`;
 }
 // 入力を検証して東京日時同士の秒差を計算し、条件と結果を一緒に表示する。
 $('difference-form').onsubmit = event => {
  event.preventDefault(); invalidateDifference();
  try {
   const difference = tokyoDateTime('end') - tokyoDateTime('start');
   const expression = `${$('start-date').value} ${$('start-time').value} → ${$('end-date').value} ${$('end-time').value}（東京）`;
   message('difference-expression', expression); message('difference-value', durationText(difference)); message('difference-total', `総秒数：${difference.toLocaleString('ja-JP')}秒`); $('difference-result').hidden = false;
  } catch (error) { message('difference-error', error.message); }
 };
 const tabs = Array.from(document.querySelectorAll('[role=tab]'));
 /**
  * 選択タブとパネル表示、キーボードで到達するタブを同期する。
  *
  * @param {HTMLElement} tab 選択するタブ要素。
  * @returns {void}
  */
 function selectTab(tab) { tabs.forEach(item => { const active = item === tab; item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1; $(item.getAttribute('aria-controls')).hidden = !active; }); }
 tabs.forEach((tab, index) => {
  tab.onclick = () => selectTab(tab);
  tab.onkeydown = event => {
   let next;
   if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
   if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
   if (event.key === 'Home') next = tabs[0]; if (event.key === 'End') next = tabs.at(-1);
   if (next) { event.preventDefault(); selectTab(next); next.focus(); }
  };
 });
 // 100ms/1000msは描画の周期。正確な通知やスリープからの復帰を保証する周期ではない。
 const measurementInterval = setInterval(() => {
  if (state === 'running') { remaining = Math.max(0, deadline - Date.now()); if (remaining === 0) finishTimer(); renderTimer(); }
  if (watchRunning) message('watch-display', watchFormat(elapsed()));
 }, 100);
 const clockInterval = setInterval(updateClocks, 1000); renderTimer(); renderWatch(); renderCities();
 // イベントと初期描画が成立した後だけ入力を許す。JS無効時は誤操作を防ぐ。
 $('time-inputs').disabled = false;
 /**
  * ページ離脱時に計測を停止し、入力・記録・選択を消去する。
  * 履歴キャッシュにも記録を残さず、復帰時は初期画面を再取得する。
  *
  * @returns {void} タイマーと時計の更新、音声を止め、ページ内状態を初期化する。
  */
 function clearPageState() {
  clearInterval(measurementInterval); clearInterval(clockInterval);
  state = 'ready'; flow = 'single'; phase = 'focus'; duration = remaining = 300000; deadline = 0;
  watchRunning = false; watchElapsed = watchAnchor = lastLap = lapCount = 0;
  baseCity = cities[0].id; selected = [baseCity]; pendingCity = null;
  for (const picker of pickers) picker.close();
  document.querySelectorAll('#time-tools input').forEach(input => {
   if (input.type === 'checkbox') input.checked = input.id === 'show-analog';
   else input.value = '';
  });
  $('timer-flow').value = 'single'; setTimeFields(duration);
  $('world-clocks').classList.remove('without-analog');
  $('laps').replaceChildren(); invalidateDifference();
  for (const id of ['watch-message', 'timer-message', 'timer-error', 'city-message', 'difference-expression', 'difference-value', 'difference-total']) message(id, '');
  renderTimer(); renderWatch(); renderCities();
  $('time-inputs').disabled = true;
  // 音声の終了失敗で離脱時の記録消去を妨げない。
  if (audio) { audio.close().catch(() => {}); audio = undefined; }
 }
 window.addEventListener('pagehide', clearPageState);
 // BFCacheから戻ったときも、終了前の入力・計測の復元は行わない。
 window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
})();
