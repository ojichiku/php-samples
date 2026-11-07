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
<nav class="text-tool-nav" id="text-tool-nav" aria-label="ページ内のツール一覧"><a href="#text-edit">テキスト編集</a><a href="#text-build">正規表現の作成</a><a href="#text-match">一致確認</a><a href="#text-generate">サンプル生成</a><a href="#regex-help">正規表現の書き方</a></nav><x-ad-slot /><div id="text-tools"><details id="text-edit" class="text-tool" data-tool="edit" open><summary>テキスト編集</summary><div class="text-tool-body">
<p>変換を選んでまとめて実行できます。入力は残るため、選び直して再実行できます。</p>
<p class="field-help">処理順：全角・半角 → 大小文字 → 置換（ルール順）→ 前後空白 → 空行 → 重複削除 → 並べ替え。選ばない処理は実行しません。</p>
<fieldset><legend>全角・半角</legend><label><input type="radio" name="edit-width" data-choice="width" value="none" checked> 変更しない</label> <label><input type="radio" name="edit-width" data-choice="width" value="half"> 半角に</label> <label><input type="radio" name="edit-width" data-choice="width" value="full"> 全角に</label> </fieldset><fieldset><legend>全角・半角の変換対象</legend><label><input type="checkbox" data-target="letters" checked> 英字</label> <label><input type="checkbox" data-target="numbers" checked> 数字</label> <label><input type="checkbox" data-target="symbols"> 記号</label> <label><input type="checkbox" data-target="space"> スペース</label> </fieldset><fieldset><legend>英字の大小文字</legend><label><input type="radio" name="edit-letterCase" data-choice="letterCase" value="none" checked> 変更しない</label> <label><input type="radio" name="edit-letterCase" data-choice="letterCase" value="upper"> 大文字に</label> <label><input type="radio" name="edit-letterCase" data-choice="letterCase" value="lower"> 小文字に</label> </fieldset><p class="field-help">幅変換は英数字・記号・スペース（カタカナは対象外）。大小変換は半角英字が対象です。</p><fieldset><legend>文字変換の適用範囲</legend><label><input type="radio" name="edit-scope" data-choice="scope" value="all" checked> 全文</label> <label><input type="radio" name="edit-scope" data-choice="scope" value="regex"> 正規表現に一致する部分</label> </fieldset><label for="edit-pattern">文字変換する部分の正規表現</label><input id="edit-pattern" data-field="pattern" type="text" autocomplete="off" placeholder="例：[a-z]+"><p><a href="#regex-help">正規表現の書き方</a>（前後の / は不要、u固定・全件処理）</p><fieldset><legend>置換</legend><label><input type="checkbox" data-choice="replaceEnabled"> 置換する</label><p>有効な場合、上から順に適用します。A→B、B→Cなら元のAもCになります。空の置換語は削除です。</p><div data-rules></div><button type="button" class="button secondary" data-add-rule>置換ルールを追加</button><p class="field-help">正規表現では $1・$&amp;・$&lt;name&gt; などを使えます。各ルールはu固定、全件置換です。</p></fieldset>
<label><input type="checkbox" data-choice="trim"> 各行の前後空白を除去</label>
<fieldset><legend>空行</legend><label><input type="radio" name="edit-blank" data-choice="blank" value="none" checked> 変更しない</label> <label><input type="radio" name="edit-blank" data-choice="blank" value="blank"> 空行を削除</label> <label><input type="radio" name="edit-blank" data-choice="blank" value="collapse"> 連続する空行を1行に</label> </fieldset><label><input type="checkbox" data-choice="unique"> 重複行を削除</label><fieldset><legend>並べ替え</legend><label><input type="radio" name="edit-sort" data-choice="sort" value="none" checked> 変更しない</label> <label><input type="radio" name="edit-sort" data-choice="sort" value="asc"> 昇順</label> <label><input type="radio" name="edit-sort" data-choice="sort" value="desc"> 降順</label> </fieldset><p class="field-help">重複判定はこの段階の行で行います。並べ替えは文字コード順で、日本語の読み順・数値順ではありません。</p><div class="text-tool-pair"><div><label for="edit-input">対象テキスト（最大10万文字）</label><textarea id="edit-input" data-field="text" rows="8" spellcheck="false" autocomplete="off"></textarea></div><div><label for="edit-output">結果（読み取り専用）</label><textarea id="edit-output" data-output readonly rows="8" spellcheck="false" autocomplete="off"></textarea></div></div><p data-stats>文字数 0 ／ 空白除外 0 ／ 行数 0</p><div class="text-actions"><button type="button" class="button" data-run disabled>選んだ処理を実行</button><button type="button" class="button secondary" data-cancel hidden>中止</button><button type="button" class="button secondary" data-copy disabled>結果をコピー</button><button type="button" class="button secondary" data-clear disabled>入力と結果をクリア</button></div><p data-status role="status" aria-live="polite"></p><p class="field-help">クリアは文章・検索語・正規表現・置換語・結果を消します。選択設定は保持します。</p></div></details><section aria-label="正規表現"><h2>正規表現</h2><details id="text-build" class="text-tool" data-tool="build"><summary>入力例から正規表現を作る</summary><div class="text-tool-body"><p>入力だけでは意図を決められません。一致させたい範囲を選んで候補を確認してください。</p><div><label for="build-input">元になる入力例（最大1,000文字）</label><textarea id="build-input" data-field="text" rows="8" spellcheck="false" autocomplete="off"></textarea></div><fieldset><legend>候補の作り方</legend><label><input type="radio" name="build-mode" data-choice="buildMode" value="exact" checked> 入力そのものに完全一致</label><label><input type="radio" name="build-mode" data-choice="buildMode" value="general"> 英字・数字を同じ種類・文字数に一般化</label></fieldset><p class="field-help">ABC-123 → [A-Z]{3}-[0-9]{3} のように変換。大小は区別し、日本語・記号はそのまま一致させます。用途の正しさは判定しません。</p><div><label for="build-positive">一致してほしい例（1行1件、空行は無視）</label><textarea id="build-positive" data-field="positive" rows="8" spellcheck="false" autocomplete="off"></textarea></div><div><label for="build-negative">一致してほしくない例（1行1件、空行は無視）</label><textarea id="build-negative" data-field="negative" rows="8" spellcheck="false" autocomplete="off"></textarea></div><div><label for="build-output">正規表現の候補（uフラグ、読み取り専用）</label><textarea id="build-output" data-output readonly rows="8" spellcheck="false" autocomplete="off"></textarea></div><div class="text-actions"><button type="button" class="button" data-run disabled>選んだ処理を実行</button><button type="button" class="button secondary" data-cancel hidden>中止</button><button type="button" class="button secondary" data-copy disabled>結果をコピー</button><button type="button" class="button secondary" data-clear disabled>入力と結果をクリア</button></div><p data-status role="status" aria-live="polite"></p><p data-checks></p><button type="button" class="button secondary" data-use-pattern disabled>候補を一致確認へ適用</button><p><a href="#regex-help">正規表現の書き方</a></p></div></details><details id="text-match" class="text-tool" data-tool="match">
<summary>正規表現の一致確認</summary>
<div class="text-tool-body">
<p>一致箇所・位置・キャプチャグループを確認します。</p>
<div data-regex-fields>
<p><a href="#regex-help">正規表現の書き方</a></p><label for="match-pattern">正規表現（前後の / は不要）</label>
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
<button type="button" class="button secondary" data-clear disabled>入力と結果をクリア</button>
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
<th>取り出した部分（グループ）</th>
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
<p><a href="#regex-help">正規表現の書き方</a></p><label for="generate-pattern">正規表現（前後の / は不要）</label>
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
<button type="button" class="button secondary" data-clear disabled>入力と結果をクリア</button>
</div>
<p class="text-status" data-status role="status" aria-live="polite">
</p>
<p>
<a href="#text-tool-nav">ツール一覧へ戻る</a>
</p>
</div>
</details>
</section></div><x-ad-slot /><section class="panel" id="regex-help"><h2>正規表現の書き方</h2><p>JavaScriptの正規表現を使います。正規表現は「探す文字の条件」です。前後の / は入力しません。</p><ul><li>[0-9]+：数字が1文字以上続く部分（例：123）</li><li>[A-Z]{3}：英大文字が3文字（例：ABC）</li><li>^：先頭、$：末尾（末尾改行の直前にも一致します）</li><li>丸括弧は部分を取り出すグループ。([0-9]{4})-([0-9]{2}) なら2026-11からグループ1に2026、グループ2に11を取り出せます。</li><li>(?&lt;year&gt;[0-9]{4})：yearという名前を付けたグループ。置換では $&lt;year&gt; を使えます。</li><li>ドットなどの記号そのものを探すにはバックスラッシュを付けます（例：\.）。</li></ul><p>i：大小を区別しない、m：行ごとの先頭・末尾、s：ドットが改行にも一致、u：Unicode。編集・作成はu固定。一致確認はi/m/s/uを選べます。全件を重なりなしで処理します。</p><p>作成機能の候補は入力全体への一致を確認します。入力例に合っても、あらゆる入力に対する正しさは保証しません。日付などの業務上の妥当性は別途確認してください。</p></section><section class="panel text-tools-help"><h2>使い方と制限</h2><p>編集と正規表現の入力は独立しています。入力を変更すると古い結果を消します。ページを離れると入力内容は失われます。</p><p>入力は10万文字、検索語・正規表現・置換語は各1,000文字、結果は100万文字まで。正規表現作成と検証例は各1,000文字まで。処理は1秒で中止します。サンプル生成は対応する構文のみです。</p><p>文字数は書記素単位で改行を除外し、空白除外は半角・全角スペースとタブも除きます。末尾改行後の空行も行数に含みます。</p><p>広告・解析の通信は発生します。アプリの解析イベントに文章・正規表現・置換語・結果は含めません。</p></section><x-text-analytics /></x-layout>