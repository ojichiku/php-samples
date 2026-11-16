{{-- time.toolsのGET画面。都市選択・計測・日時差はtime-tools.jsがブラウザー内だけで処理する。 --}}
<x-layout title="時間ツール" active="time-tools">
    <noscript><p class="error-box">このツールにはJavaScriptが必要です。ブラウザーの設定を確認してください。</p></noscript>
    <div id="time-tools" class="time-tools">

<section class="intro"><h1>時間ツール</h1><p>時刻を比べる・時間を測る・差を計算する。<span class="review-note">設定・記録は再読み込みやページ終了で消えます。</span></p></section>
<fieldset id="time-inputs" disabled><div class="tabs" role="tablist" aria-label="時間ツール">
<button id="world-tab" role="tab" aria-controls="world-panel" aria-selected="false" tabindex="-1">世界時計</button>
<button id="watch-tab" role="tab" aria-controls="watch-panel" aria-selected="false" tabindex="-1">ストップウォッチ</button>
<button id="timer-tab" role="tab" aria-controls="timer-panel" aria-selected="true">タイマー</button>
<button id="difference-tab" role="tab" aria-controls="difference-panel" aria-selected="false" tabindex="-1">日時の差を計算</button>
</div><p id="background-state" class="background" role="status"></p>
<section id="world-panel" role="tabpanel" aria-labelledby="world-tab" hidden>
<div class="card"><div class="section-head"><h2>世界時計</h2><span class="small muted">基準都市との時差を表示</span></div>
<div class="world-settings"><div class="city-picker" id="base-city-picker"><span class="picker-label" id="base-city-label">基準都市</span><button id="base-city" type="button" class="picker-trigger" aria-labelledby="base-city-label base-city-value" aria-haspopup="dialog" aria-expanded="false" aria-controls="base-city-panel"><span id="base-city-value">都市を選ぶ</span><span aria-hidden="true"> ▾</span></button><div id="base-city-panel" class="picker-panel" role="dialog" aria-label="基準都市の選択" hidden><label class="sr-only" for="base-city-search">基準都市を検索</label><input id="base-city-search" type="search" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="base-city-options" autocomplete="off" placeholder="都市名・国名で検索"><p id="base-city-count" class="picker-count" role="status"></p><div id="base-city-options" class="picker-options" role="listbox" aria-label="基準都市の候補"></div></div></div><form id="city-form" class="city-form"><div class="city-picker" id="city-select-picker"><span class="picker-label" id="city-select-label">比較する都市</span><button id="city-select" type="button" class="picker-trigger" aria-labelledby="city-select-label city-select-value" aria-haspopup="dialog" aria-expanded="false" aria-controls="city-select-panel"><span id="city-select-value">都市を選ぶ</span><span aria-hidden="true"> ▾</span></button><div id="city-select-panel" class="picker-panel" role="dialog" aria-label="比較する都市の選択" hidden><label class="sr-only" for="city-select-search">比較する都市を検索</label><input id="city-select-search" type="search" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="city-select-options" autocomplete="off" placeholder="都市名・国名で検索"><p id="city-select-count" class="picker-count" role="status"></p><div id="city-select-options" class="picker-options" role="listbox" aria-label="比較する都市の候補"></div></div></div><button id="city-add" class="outline" type="submit" disabled>追加</button></form><button id="cities-clear">比較都市をすべて削除</button></div>
<label class="analog-toggle check"><input id="show-analog" type="checkbox" checked> アナログ時計を表示</label>
<p id="city-message" class="message" role="status"></p><ul id="world-clocks" class="world-clocks"></ul>
<section class="quick-reference" aria-labelledby="quick-title"><div class="section-head"><h3 id="quick-title">主要都市の時差早見表</h3></div><p id="quick-basis" class="small muted"></p><table id="quick-table"><thead><tr><th scope="col">都市</th><th scope="col">基準との差</th></tr></thead><tbody id="quick-cities"></tbody></table><p class="small muted">現在の時差です。夏時間の切替で変わることがあります。</p></section>
</div></section>
<section id="watch-panel" role="tabpanel" aria-labelledby="watch-tab" hidden>
<div class="card clock-card"><div class="section-head"><h2>ストップウォッチ</h2><span id="watch-state" class="pill">計測前</span></div>
<p id="watch-display" class="digits watch-digits" aria-label="経過時間">00:00.0</p>
<label class="lap-name-field" for="lap-name">区間名 <input id="lap-name" type="text" maxlength="40" placeholder="空欄なら「区間1」" autocomplete="off"></label>
<div class="controls"><button id="watch-start" class="primary">開始</button><button id="watch-lap" disabled>区間を記録</button><button id="watch-reset">リセット</button></div>
<section class="lap-section" aria-labelledby="lap-heading"><div class="section-head"><h3 id="lap-heading">区間の記録</h3><span class="small muted">区間時間 / 合計</span></div><ol id="laps" class="laps"><li class="muted">まだ区間の記録はありません。</li></ol></section>
<p id="watch-message" class="message" role="status"></p></div></section>
<section id="timer-panel" role="tabpanel" aria-labelledby="timer-tab">
<div class="card clock-card"><div class="section-head"><h2>タイマー</h2><span id="timer-state" class="pill">準備できました</span></div>
<form id="timer-form" novalidate>
<div class="timer-setup"><label class="inline-field" for="timer-flow">計測の流れ<select id="timer-flow"><option value="single">1回のタイマー</option><option value="pomodoro">25分集中 → 5分休憩</option></select></label>
<fieldset class="duration"><legend>設定時間（時:分:秒）</legend><label for="hours"><span class="sr-only">時</span><input id="hours" type="number" inputmode="numeric" min="0" max="99" value="00" aria-label="時"></label><span aria-hidden="true">:</span><label for="minutes"><span class="sr-only">分</span><input id="minutes" type="number" inputmode="numeric" min="0" max="59" value="05" aria-label="分"></label><span aria-hidden="true">:</span><label for="seconds"><span class="sr-only">秒</span><input id="seconds" type="number" inputmode="numeric" min="0" max="59" value="00" aria-label="秒"></label></fieldset></div>
<div class="presets" aria-label="時間の候補"><button type="button" data-minutes="1">1分</button><button type="button" data-minutes="3">3分</button><button type="button" data-minutes="5">5分</button><button type="button" data-minutes="10">10分</button><button type="button" data-minutes="30">30分</button></div>
<p id="pomodoro-help" class="small muted" hidden>集中25分・休憩5分。終了後、ボタンで次へ進み、開始します。</p>
<p id="timer-error" class="error" role="alert"></p>
<p id="timer-phase" class="phase" hidden>集中 · 25分</p><p id="timer-display" class="digits" aria-label="残り時間">00:05:00</p>
<div class="track" aria-hidden="true"><div id="timer-progress"></div></div>
<div class="controls"><button id="timer-start" class="primary" type="submit">開始</button><button id="timer-reset" type="button">リセット</button></div><button id="timer-next" type="button" class="outline" hidden>5分の休憩へ進む</button>
</form><p id="timer-message" class="message" role="status"></p>
<details><summary>終了の知らせ方</summary><div class="sound-settings"><label class="check"><input id="sound" type="checkbox"> 短い音でも知らせる</label><button id="sound-test">音を試す</button></div><p class="small muted">画面にも終了を表示します。タブを閉じた場合や端末のスリープ中は、予定どおりの通知を保証できません。</p></details>
</div></section>
<section id="difference-panel" role="tabpanel" aria-labelledby="difference-tab" hidden>
<div class="card"><div class="section-head"><h2>日時の差を計算</h2><span class="small muted">日・時・分・秒で表示</span></div>
<form id="difference-form" novalidate>
<p class="small muted">開始日時と終了日時から、何日・何時間・何分・何秒かを計算します。</p>
<div id="datetime-settings"><p class="small muted">東京の日時で計算します。1日＝24時間です。</p><div class="datetime-grid"><fieldset class="datetime-row"><legend>開始</legend><label>日付<input id="start-date" type="date" min="0001-01-01" max="9999-12-31"></label><label>時刻<input id="start-time" type="time" step="1" value="00:00:00"></label></fieldset><fieldset class="datetime-row"><legend>終了</legend><label>日付<input id="end-date" type="date" min="0001-01-01" max="9999-12-31"></label><label>時刻<input id="end-time" type="time" step="1" value="00:00:00"></label></fieldset></div></div>
<p id="difference-error" class="error" role="alert"></p><button id="difference-calculate" class="primary" type="submit">経過時間を計算</button>
<div id="difference-result" class="difference-result" role="status" hidden><p id="difference-expression" class="small muted"></p><p id="difference-value"></p><p id="difference-total" class="small muted"></p></div>
</form></div></section>
</fieldset>
    </div>
    <x-ad-slot />
</x-layout>
