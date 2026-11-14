<x-layout title="単位換算ツール" active="unit-converter">
    <section class="page-heading compact">
        <a class="back-link" href="{{ route('tools.index') }}">← ツール一覧</a>
        <span class="badge">8分類の換算と早見表</span>
        <h1 id="page-title">単位換算ツール</h1>
        <p id="page-description">ヤードやポンド、デシリットルからジュールまで。単位を選んで換算し、早見表で意味や関係も確認できます。</p>
        <p class="unit-privacy">計算はブラウザー内で行い、アプリは入力・結果を送信・保存しません。このページでは広告を利用します。</p>
    </section>
    <noscript><p class="error-box">このツールにはJavaScriptが必要です。ブラウザーの設定を確認してください。</p></noscript>
    <p id="unit-unsupported" class="error-box" hidden>このブラウザーでは換算処理を利用できません。ブラウザーを更新してください。</p>
    <x-ad-slot />
    <div id="unit-converter">
<section class="selection" aria-labelledby="category-heading"><h2 id="category-heading">何を換算しますか？</h2><div id="categories" role="group" aria-label="換算する分類"></div><p id="hint" class="muted"></p></section>
<div id="workspace" class="workspace"><form id="form" class="card" novalidate><fieldset id="unit-inputs" disabled><h2>数値と単位を選ぶ</h2>
<div class="conversion-row" id="source-row"><div><label for="value">変換元の数値</label><input id="value" type="text" maxlength="64" inputmode="decimal" placeholder="例：1.5" aria-describedby="input-help" autocomplete="off"></div><div><label for="from">単位</label><select id="from" aria-label="変換元の単位"></select></div></div>
<small id="input-help">半角数字・小数9桁まで。カンマは付けずに入力してください。</small>
<div class="conversion-row" id="target-row"><div><label for="converted">変換後の数値</label><input id="converted" type="text" readonly placeholder="換算結果" aria-describedby="result-note result"></div><div><label for="to">単位</label><select id="to" aria-label="変換後の単位"></select></div></div>
<div class="actions"><button class="primary" type="submit">換算</button><button id="swap" type="button">単位の入れ替え</button></div>
<p id="result" role="status" aria-live="polite"></p><p id="result-note" class="muted"></p>
<div class="actions secondary"><button id="copy" type="button" disabled>結果をコピー</button><button id="reset" type="button">数値をクリア</button></div><p id="copy-status" role="status"></p><div id="copy-fallback" hidden><label for="fallback">コピーする結果</label><textarea id="fallback" readonly></textarea></div>
<small>変換後の数値は換算すると表示されます。最大12桁の有効数字で、≈は丸めた値です。</small></fieldset></form></div>
<section id="reference" class="card" aria-labelledby="table-heading"><h2 id="table-heading"></h2><p>単位名・記号と、基準となる単位との関係を確認できます。</p><table><caption class="sr-only">選択した分類の単位早見表</caption><thead><tr><th scope="col">単位名</th><th scope="col">記号</th><th scope="col">基準単位との関係</th></tr></thead><tbody id="rows"></tbody></table><p id="table-note" class="muted"></p></section>
    </div>
    <x-ad-slot />
    <details class="unit-notes card"><summary>入力と換算について</summary><p>分類を変更すると数値は空になります。単位の入替えでは入力数値を維持し、再度「換算」を押します。入力や単位を変えると前の結果を消します。</p><p>入力は有効数字15桁、絶対値1兆以下。温度以外は0以上です。履歴や入力を保存する機能はありません。</p><p>カロリーは熱化学カロリーとして計算します。食品表示の定義や丸めによっては表示値と一致しない場合があります。</p></details>
    <p class="unit-sources">単位定義の参照：<a href="https://www.bipm.org/en/publications/si-brochure/" target="_blank" rel="noopener noreferrer">BIPM SI Brochure</a> / <a href="https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors" target="_blank" rel="noopener noreferrer">NIST 換算資料</a></p>
</x-layout>
