<x-layout title="日付・元号ツール" active="date-tools">
    <section class="page-heading compact">
        <a class="back-link" href="{{ route('tools.index') }}">← ツール一覧</a>
        <h1>日付・元号ツール</h1>
        <p class="lead">西暦と元号の変換、日付や年齢を調べる</p>
        <p class="date-tool-privacy">計算はブラウザー内で行い、アプリは入力・結果を送信・保存しません。このページでは広告を利用します。機密情報は入力しないでください。</p>
    </section>
    <noscript><p class="error-box">このツールにはJavaScriptが必要です。ブラウザーの設定を確認してください。</p></noscript>
    <x-ad-slot />
<div class="layout" id="date-tools">
<nav aria-label="日付・元号の機能">
<button type="button" data-panel="western" aria-pressed="true" aria-controls="western">西暦から元号</button>
<button type="button" data-panel="japanese" aria-pressed="false" aria-controls="japanese">元号から西暦</button>
<button type="button" data-panel="table" aria-pressed="false" aria-controls="table">元号対応表</button>
<button type="button" data-panel="dates" aria-pressed="false" aria-controls="dates">日付計算</button>
<button type="button" data-panel="age" aria-pressed="false" aria-controls="age">年齢</button>
</nav>
<div>
<section id="western"><h2>西暦から元号</h2><p class="intro">年だけでも、年月日を指定しても調べられます。</p><div class="workspace">
<form data-form="western" novalidate><fieldset data-date-inputs disabled>
<div class="field"><label for="western-mode">入力するもの</label><select id="western-mode"><option value="date">年月日</option><option value="year">年だけ</option></select></div>
<div class="field" id="western-date-field"><label for="western-date">西暦の年月日</label><input id="western-date" type="date" autocomplete="off" min="1873-01-01" max="2100-12-31" value="2019-05-01"></div>
<div class="field" id="western-year-field" hidden><label for="western-year">西暦の年</label><input id="western-year" type="number" min="1873" max="2100" value="2019"><p class="hint">改元年は、両方の元号と日付の範囲を表示します。</p></div>
<div class="actions"><button class="primary">変換する</button><button type="button" data-clear="western">入力を消す</button></div>
</fieldset></form><div class="output"><h3>変換結果</h3><div id="western-result" class="result placeholder" role="status">日付または年を入力して変換してください。</div><button type="button" data-copy="western" hidden>結果をコピー</button><p class="copy-status" id="western-copy-status" role="status"></p><textarea class="copy-fallback" id="western-copy-fallback" aria-label="手動コピー用の結果" readonly hidden></textarea></div>
</div></section>
<section id="japanese" hidden><h2>元号から西暦</h2><p class="intro">元号と年を選び、必要な場合は月日も指定します。</p><div class="workspace">
<form data-form="japanese" novalidate><fieldset data-date-inputs disabled>
<div class="row"><div class="field"><label for="era-name">元号</label><select id="era-name"><option>令和</option><option>平成</option><option>昭和</option><option>大正</option><option>明治</option></select></div><div class="field"><label for="era-year">年（元年は1）</label><input id="era-year" type="text" inputmode="numeric" value="元" maxlength="4"></div></div>
<div class="field"><label for="era-mode">入力するもの</label><select id="era-mode"><option value="date">年月日</option><option value="year">年だけ</option></select></div>
<div id="era-month-day" class="row"><div class="field"><label for="era-month">月</label><input id="era-month" type="number" min="1" max="12" value="5"></div><div class="field"><label for="era-day">日</label><input id="era-day" type="number" min="1" max="31" value="1"></div></div>
<p class="hint">その元号で存在しない日付は、変換せずにお知らせします。</p><div class="actions"><button class="primary">変換する</button><button type="button" data-clear="japanese">入力を消す</button></div>
</fieldset></form><div class="output"><h3>変換結果</h3><div id="japanese-result" class="result placeholder" role="status">元号と年を入力して変換してください。</div><button type="button" data-copy="japanese" hidden>結果をコピー</button><p class="copy-status" id="japanese-copy-status" role="status"></p><textarea class="copy-fallback" id="japanese-copy-fallback" aria-label="手動コピー用の結果" readonly hidden></textarea></div>
</div></section>
<section id="table" class="table-panel" hidden><h2>元号対応表</h2><p class="intro">調べたい年の範囲で、西暦と元号を並べます。</p>
<form data-form="table" novalidate><fieldset data-date-inputs disabled><div class="inline-inputs"><div class="field"><label for="table-start">開始年</label><input id="table-start" type="number" min="1873" max="2100" value="2010"></div><div class="field"><label for="table-end">終了年</label><input id="table-end" type="number" min="1873" max="2100" value="2029"></div></div><p class="hint">1873〜2100年の範囲で、一度に最大50年分を表示します。</p><div class="actions"><button class="primary">対応表を表示</button><button type="button" id="table-near-today">今年の前後10年</button></div></fieldset></form>
<div class="output"><div id="table-result" class="result placeholder" role="status">年の範囲を指定して表示してください。</div><button type="button" data-copy="table" hidden>表をコピー</button><p class="copy-status" id="table-copy-status" role="status"></p><textarea class="copy-fallback" id="table-copy-fallback" aria-label="手動コピー用の対応表" readonly hidden></textarea></div>
<div class="table-wrap" id="era-table-wrap" hidden><table><caption>西暦・元号の対応表</caption><thead><tr><th scope="col">西暦</th><th scope="col">元号・期間</th></tr></thead><tbody id="era-table-body"></tbody></table></div>
</section>
<section id="dates" hidden><h2>日付計算</h2><p class="intro">2日間の日数や、指定日から何日後・何日前かを調べます。</p><div class="workspace">
<form data-form="dates" novalidate><fieldset data-date-inputs disabled><div class="field"><label for="date-operation">計算するもの</label><select id="date-operation"><option value="diff">2日間の日数</option><option value="add">何日後・何日前</option></select></div><div class="field"><label for="date-start" id="date-start-label">開始日</label><input id="date-start" type="date" autocomplete="off" min="1873-01-01" max="2100-12-31" value="2026-11-01"></div>
<div id="diff-fields"><div class="field"><label for="date-end">終了日</label><input id="date-end" type="date" autocomplete="off" min="1873-01-01" max="2100-12-31" value="2026-11-08"></div><label class="check"><input id="include-start" type="checkbox">開始日を含める</label><p class="hint">含めない場合、同じ日付は0日です。</p></div>
<div id="add-fields" hidden><div class="row"><div class="field"><label for="day-direction">方向</label><select id="day-direction"><option value="1">後</option><option value="-1">前</option></select></div><div class="field"><label for="day-count">日数</label><input id="day-count" type="number" min="0" max="100000" value="30"></div></div></div>
<div class="actions"><button class="primary">計算する</button><button type="button" data-clear="dates">入力を消す</button></div>
</fieldset></form><div class="output"><h3>計算結果</h3><div id="dates-result" class="result placeholder" role="status">条件を指定して計算してください。</div><button type="button" data-copy="dates" hidden>結果をコピー</button><p class="copy-status" id="dates-copy-status" role="status"></p><textarea class="copy-fallback" id="dates-copy-fallback" aria-label="手動コピー用の日付計算結果" readonly hidden></textarea></div>
</div></section>
<section id="age" hidden><h2>年齢</h2><p class="intro">誕生日と基準日から、満何歳かを調べます。</p><div class="workspace">
<form data-form="age" novalidate><fieldset data-date-inputs disabled><div class="field"><label for="birth-date">誕生日</label><input id="birth-date" type="date" autocomplete="off" min="1873-01-01" max="2100-12-31" value="2000-02-29"></div><div class="field"><label for="age-reference">基準日</label><input id="age-reference" type="date" autocomplete="off" min="1873-01-01" max="2100-12-31" value="2026-11-08"></div><button type="button" id="age-today">今日を入れる</button>
<details class="note"><summary>2月29日生まれの計算方法</summary><div class="field"><label for="leap-policy">平年に誕生日として扱う日</label><select id="leap-policy"><option value="march">3月1日</option><option value="february">2月28日</option></select></div><p>この画面では、選んだ誕生日の基準で計算します。</p></details>
<div class="actions"><button class="primary">計算する</button><button type="button" data-clear="age">入力を消す</button></div>
</fieldset></form><div class="output"><h3>計算結果</h3><div id="age-result" class="result placeholder" role="status">誕生日と基準日を入力してください。</div><button type="button" data-copy="age" hidden>結果をコピー</button><p class="copy-status" id="age-copy-status" role="status"></p><textarea class="copy-fallback" id="age-copy-fallback" aria-label="手動コピー用の年齢結果" readonly hidden></textarea></div>
</div></section>
<p class="range">対応範囲：1873年1月1日〜2100年12月31日。未来の元号は、現在の令和が続く場合の換算として表示します。</p>
</div></div>

    <x-ad-slot />
</x-layout>
