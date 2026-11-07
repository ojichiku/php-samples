<x-layout title="テキスト便利ツール集" active="text-tools">
<section class="page-heading compact">
    <a class="back-link" href="{{ route('tools.index') }}">← ツール一覧</a>
    <h1>テキスト便利ツール集</h1>
    <p class="lead">文字数の確認から整形・置換・正規表現まで。使いたいツールを選んでください。</p>
    <p class="text-privacy">文字処理はブラウザー内で実行します。このページは広告・アクセス解析を利用します。機密情報は入力しないでください。入力内容をアプリのサーバーへ保存する機能はありません。</p>
</section>
<noscript>
<p class="error-box">このツールにはJavaScriptが必要です。</p>
</noscript>
<nav class="text-tool-nav" id="text-tool-nav" aria-label="ページ内のツール一覧">
<a href="#text-count">文字数カウンター</a>
<a href="#text-format">テキスト整形</a>
<a href="#text-replace">文字列置換</a>
<a href="#text-lines">行の整理</a>
<a href="#text-convert">文字変換</a>
<a href="#text-match">正規表現の一致確認</a>
<a href="#text-generate">正規表現のサンプル生成</a>
</nav>
<x-ad-slot />
<div id="text-tools">
<details id="text-count" class="text-tool" data-tool="count" open>
<summary>文字数カウンター</summary>
<div class="text-tool-body">
<p>文章を入力すると文字数・空白除外文字数・行数を確認できます。</p>
<div class="text-tool-pair">
<div>
<label for="count-input">対象テキスト（最大10万文字）</label>
<textarea id="count-input" data-field="text" rows="6" spellcheck="false" autocomplete="off">
</textarea>
</div>
<div class="text-stats" data-stats>文字数 0 ／ 空白除外 0 ／ 行数 0</div>
</div>
<div class="text-actions">
<button type="button" class="button secondary" data-clear disabled>このツールを消去</button>
</div>
<p class="text-status" data-status role="status" aria-live="polite">
</p>
<p>
<a href="#text-tool-nav">ツール一覧へ戻る</a>
</p>
</div>
</details>
<details id="text-format" class="text-tool" data-tool="format">
<summary>テキスト整形</summary>
<div class="text-tool-body">
<p>各行の空白や空行を整理します。</p>
<label for="format-operation">整形方法</label>
<select id="format-operation" data-field="operation">
<option value="trim">各行の前後空白を除去</option>
<option value="blank">空行を削除</option>
<option value="collapse">連続する空行を1行に</option>
</select>
<div class="text-tool-pair">
<div>
<label for="format-input">対象テキスト（最大10万文字）</label>
<textarea id="format-input" data-field="text" rows="6" spellcheck="false" autocomplete="off">
</textarea>
</div>
<div>
<label for="format-output">結果（読み取り専用）</label>
<textarea id="format-output" data-output rows="6" readonly>
</textarea>
</div>
</div>
<div class="text-actions">
<button type="button" class="button" data-run disabled>実行</button>
<button type="button" class="button secondary" data-cancel hidden>中止</button>
<button type="button" class="button secondary" data-copy disabled>結果をコピー</button>
<button type="button" class="button secondary" data-clear disabled>このツールを消去</button>
</div>
<p class="text-status" data-status role="status" aria-live="polite">
</p>
<p>
<a href="#text-tool-nav">ツール一覧へ戻る</a>
</p>
</div>
</details>
<details id="text-replace" class="text-tool" data-tool="replace">
<summary>文字列置換</summary>
<div class="text-tool-body">
<p>通常の文字列、または正規表現で置き換えます。</p>
<label for="replace-mode">検索方法</label>
<select id="replace-mode" data-field="mode">
<option value="literal">通常の文字列</option>
<option value="regex">正規表現</option>
</select>
<div data-literal-fields>
<label for="replace-search">検索する文字列</label>
<input id="replace-search" data-field="search" type="text" autocomplete="off">
</div>
<div data-regex-fields hidden>
<label for="replace-pattern">正規表現（前後の / は不要）</label>
<input id="replace-pattern" data-field="pattern" type="text" spellcheck="false" autocomplete="off" placeholder="例: [0-9]+">
<fieldset class="text-flags">
<legend>フラグ</legend>
<label>
<input type="checkbox" data-flag="i"> i：大小文字を区別しない</label>
<label>
<input type="checkbox" data-flag="m"> m：行ごとの先頭・末尾</label>
<label>
<input type="checkbox" data-flag="s"> s：ドットが改行にも一致</label>
<label>
<input type="checkbox" data-flag="u" checked> u：Unicode</label>
</fieldset>
</div>
<label for="replace-replacement">置換後の文字列（空欄で削除）</label>
<input id="replace-replacement" data-field="replacement" type="text" autocomplete="off">
<p class="field-help">全件を置換します。正規表現では $1（グループ1）、$&amp;（一致全体）、$$（$そのもの）などを使えます。通常検索ではそのままの文字列として扱います。</p>
<div class="text-tool-pair">
<div>
<label for="replace-input">対象テキスト（最大10万文字）</label>
<textarea id="replace-input" data-field="text" rows="6" spellcheck="false" autocomplete="off">
</textarea>
</div>
<div>
<label for="replace-output">結果（読み取り専用）</label>
<textarea id="replace-output" data-output rows="6" readonly>
</textarea>
</div>
</div>
<div class="text-actions">
<button type="button" class="button" data-run disabled>実行</button>
<button type="button" class="button secondary" data-cancel hidden>中止</button>
<button type="button" class="button secondary" data-copy disabled>結果をコピー</button>
<button type="button" class="button secondary" data-clear disabled>このツールを消去</button>
</div>
<p class="text-status" data-status role="status" aria-live="polite">
</p>
<p>
<a href="#text-tool-nav">ツール一覧へ戻る</a>
</p>
</div>
</details>
<details id="text-lines" class="text-tool" data-tool="lines">
<summary>行の整理</summary>
<div class="text-tool-body">
<p>重複行の削除と、文字コード順の並べ替えができます。</p>
<label for="lines-operation">整理方法</label>
<select id="lines-operation" data-field="operation">
<option value="unique">重複行を削除</option>
<option value="asc">昇順（文字コード順）</option>
<option value="desc">降順（文字コード順）</option>
</select>
<p class="field-help">大小文字・空白を区別します。並べ替えは日本語の読み順・数値順ではありません。</p>
<div class="text-tool-pair">
<div>
<label for="lines-input">対象テキスト（最大10万文字）</label>
<textarea id="lines-input" data-field="text" rows="6" spellcheck="false" autocomplete="off">
</textarea>
</div>
<div>
<label for="lines-output">結果（読み取り専用）</label>
<textarea id="lines-output" data-output rows="6" readonly>
</textarea>
</div>
</div>
<div class="text-actions">
<button type="button" class="button" data-run disabled>実行</button>
<button type="button" class="button secondary" data-cancel hidden>中止</button>
<button type="button" class="button secondary" data-copy disabled>結果をコピー</button>
<button type="button" class="button secondary" data-clear disabled>このツールを消去</button>
</div>
<p class="text-status" data-status role="status" aria-live="polite">
</p>
<p>
<a href="#text-tool-nav">ツール一覧へ戻る</a>
</p>
</div>
</details>
<details id="text-convert" class="text-tool" data-tool="convert">
<summary>文字変換</summary>
<div class="text-tool-body">
<p>全文、または正規表現に一致した部分だけを変換します。</p>
<label for="convert-operation">変換方法</label>
<select id="convert-operation" data-field="operation">
<option value="upper">英字を大文字に</option>
<option value="lower">英字を小文字に</option>
<option value="half">全角から半角</option>
<option value="full">半角から全角</option>
</select>
<label for="convert-mode">適用範囲</label>
<select id="convert-mode" data-field="mode">
<option value="all">全文</option>
<option value="regex">正規表現に一致した部分だけ</option>
</select>
<div data-regex-fields hidden>
<label for="convert-pattern">正規表現（前後の / は不要）</label>
<input id="convert-pattern" data-field="pattern" type="text" spellcheck="false" autocomplete="off" placeholder="例: [0-9]+">
<fieldset class="text-flags">
<legend>フラグ</legend>
<label>
<input type="checkbox" data-flag="i"> i：大小文字を区別しない</label>
<label>
<input type="checkbox" data-flag="m"> m：行ごとの先頭・末尾</label>
<label>
<input type="checkbox" data-flag="s"> s：ドットが改行にも一致</label>
<label>
<input type="checkbox" data-flag="u" checked> u：Unicode</label>
</fieldset>
</div>
<fieldset class="text-flags" data-width-targets hidden>
<legend>全角・半角の変換対象</legend>
<label>
<input type="checkbox" data-target="letters" checked> 英字</label>
<label>
<input type="checkbox" data-target="numbers" checked> 数字</label>
<label>
<input type="checkbox" data-target="symbols"> 記号</label>
<label>
<input type="checkbox" data-target="space"> スペース</label>
</fieldset>
<p class="field-help">大小変換はASCII英字、全角・半角は英数字・記号・スペースが対象です。カタカナは変換しません。</p>
<div class="text-tool-pair">
<div>
<label for="convert-input">対象テキスト（最大10万文字）</label>
<textarea id="convert-input" data-field="text" rows="6" spellcheck="false" autocomplete="off">
</textarea>
</div>
<div>
<label for="convert-output">結果（読み取り専用）</label>
<textarea id="convert-output" data-output rows="6" readonly>
</textarea>
</div>
</div>
<div class="text-actions">
<button type="button" class="button" data-run disabled>実行</button>
<button type="button" class="button secondary" data-cancel hidden>中止</button>
<button type="button" class="button secondary" data-copy disabled>結果をコピー</button>
<button type="button" class="button secondary" data-clear disabled>このツールを消去</button>
</div>
<p class="text-status" data-status role="status" aria-live="polite">
</p>
<p>
<a href="#text-tool-nav">ツール一覧へ戻る</a>
</p>
</div>
</details>
<details id="text-match" class="text-tool" data-tool="match">
<summary>正規表現の一致確認</summary>
<div class="text-tool-body">
<p>一致箇所・位置・キャプチャグループを確認します。</p>
<div data-regex-fields>
<label for="match-pattern">正規表現（前後の / は不要）</label>
<input id="match-pattern" data-field="pattern" type="text" spellcheck="false" autocomplete="off" placeholder="例: [0-9]+">
<fieldset class="text-flags">
<legend>フラグ</legend>
<label>
<input type="checkbox" data-flag="i"> i：大小文字を区別しない</label>
<label>
<input type="checkbox" data-flag="m"> m：行ごとの先頭・末尾</label>
<label>
<input type="checkbox" data-flag="s"> s：ドットが改行にも一致</label>
<label>
<input type="checkbox" data-flag="u" checked> u：Unicode</label>
</fieldset>
</div>
<div class="text-tool-pair">
<div>
<label for="match-input">対象テキスト（最大10万文字）</label>
<textarea id="match-input" data-field="text" rows="6" spellcheck="false" autocomplete="off">
</textarea>
</div>
<div>
<label for="match-output">結果（読み取り専用）</label>
<textarea id="match-output" data-output rows="6" readonly>
</textarea>
</div>
</div>
<div class="text-actions">
<button type="button" class="button" data-run disabled>実行</button>
<button type="button" class="button secondary" data-cancel hidden>中止</button>
<button type="button" class="button secondary" data-copy disabled>結果をコピー</button>
<button type="button" class="button secondary" data-clear disabled>このツールを消去</button>
</div>
<p class="text-status" data-status role="status" aria-live="polite">
</p>
<section data-match-results hidden>
<h3>一致箇所</h3>
<div class="text-highlight" data-highlight>
</div>
<h3>一致一覧</h3>
<p class="field-help">位置は1始まりの行・列（列はUnicodeコードポイント単位）。空文字一致は位置マーカーで表示します。先頭1,000件まで表示します。</p>
<div class="text-table-wrap">
<table>
<thead>
<tr>
<th>番号</th>
<th>一致文字列</th>
<th>行・列</th>
<th>キャプチャ</th>
</tr>
</thead>
<tbody data-matches>
</tbody>
</table>
</div>
<button type="button" class="button secondary" data-copy-list disabled>一致一覧をコピー</button>
</section>
<p>
<a href="#text-tool-nav">ツール一覧へ戻る</a>
</p>
</div>
</details>
<details id="text-generate" class="text-tool" data-tool="generate">
<summary>正規表現のサンプル生成</summary>
<div class="text-tool-body">
<p>対応するパターン全体に一致する文字列の例を生成します。</p>
<label for="generate-pattern">正規表現（前後の / は不要）</label>
<input id="generate-pattern" data-field="pattern" type="text" spellcheck="false" autocomplete="off" placeholder="例: [A-Z]{2}[0-9]{3}">
<label for="generate-amount">生成件数（1〜10件）</label>
<input id="generate-amount" data-field="amount" type="number" min="1" max="10" value="3">
<p class="field-help">uフラグ固定。1件256文字、回数指定100回、*と+は最大10回。通常文字はASCII、文字クラス・選択・グループ・回数指定に対応。先読み・後読み・後方参照・否定クラス・ドット・Unicodeプロパティ等は生成できません。空文字は「（空文字）」と表示します。</p>
<div class="text-tool-pair">
<div>
<label for="generate-output">結果（読み取り専用）</label>
<textarea id="generate-output" data-output rows="6" readonly>
</textarea>
</div>
</div>
<div class="text-actions">
<button type="button" class="button" data-run disabled>実行</button>
<button type="button" class="button secondary" data-cancel hidden>中止</button>
<button type="button" class="button secondary" data-copy disabled>結果をコピー</button>
<button type="button" class="button secondary" data-clear disabled>このツールを消去</button>
</div>
<p class="text-status" data-status role="status" aria-live="polite">
</p>
<p>
<a href="#text-tool-nav">ツール一覧へ戻る</a>
</p>
</div>
</details>
</div>
<x-ad-slot />
<section class="panel text-tools-help">
<h2>使い方と制限</h2>
<p>各ツールの入力・結果は独立しています。別のツールで続きを行う場合は、結果をコピーして貼り付けてください。ページを離れると内容は失われます。</p>
<p>文字数は見た目の1文字に近い書記素単位で数え、改行は除外します。空白除外では半角・全角スペースとタブも除きます。末尾改行の後の空行も行数に含めます。</p>
<p>正規表現はJavaScriptの構文です。置換・変換・一致確認はi/m/s/uに対応し、全件を重なりなしで処理します。空文字一致も位置を進めて処理します。実行は1秒で中止します。サンプル生成は対応構文に限り、生成した文字列全体への一致を検証します。要求数に達しない場合もあります。</p>
<p>正規表現の置換では $1〜$99、$&amp;、$&lt;name&gt;、$$、$`（前の文脈）、$'（後の文脈）をJavaScript標準の規則で使えます。未一致のグループは空、存在しないグループ参照は標準の規則に従います。関数やコードは入力できません。</p>
<p>検索語・正規表現・置換語は各1,000文字、出力は100万文字までです。広告・解析の通信は発生します。アプリが送る解析イベントに、文章・正規表現・置換語・結果は含めません。</p>
</section>
<x-text-analytics />
</x-layout>
