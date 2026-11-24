{{-- 合意済みの順序で入力、出力形式、チェック結果を表示する。ファイル処理はJavaScriptが担当する。 --}}
<x-layout title="表データコンバーター" active="tabular-data-converter">
    <x-slot:head>
        @vite('resources/js/tabular-data-converter.js')
    </x-slot:head>

    <div class="tabular-data-converter">
        <x-tool-back-link />
        <h1 class="tool-title">表データコンバーター</h1>
        <p>CSV・TSVを確認して、Excel・OpenOffice用のファイルに変換します。</p>
        <p class="notice">ファイルの確認と変換はブラウザー内で行います。ファイルはサーバーに送信されません。</p>
        <x-ad-slot />
        <section aria-labelledby="input-title">
            <h2 id="input-title">入力ファイル</h2>
            <label for="input-file" class="file-label">CSV・TSVファイルを選択</label>
            <input id="input-file" type="file">
            <div class="settings">
                <label>入力形式
                    <select id="input-format">
                        <option value="" disabled selected>入力形式を選択</option>
                        <option value="csv">CSV（カンマ区切り）</option>
                        <option value="tsv">TSV（タブ区切り）</option>
                    </select>
                </label>
                <label>文字コード
                    <select id="encoding">
                        <option value="utf8">UTF-8（BOM付きも対応）</option>
                        <option value="cp932">Shift_JIS（CP932）</option>
                    </select>
                </label>
                <label>ダブルクォート
                    <select id="quotes">
                        <option value="quoted">引用符として扱う</option>
                        <option value="literal">通常の文字として扱う</option>
                    </select>
                </label>
            </div>
            <p class="secondary">最大5,000データ行・100列・5 MiB。先頭行は見出しとして扱います。</p>
            <div class="settings">
                <label>出力形式
                    <select id="format">
                        <option value="xlsx">Excel (.xlsx)</option>
                        <option value="ods">OpenOffice Calc (.ods)</option>
                    </select>
                </label>
            </div>
            <div class="actions">
                <button id="check" type="button" disabled>ファイルをチェック</button>
                <button id="output" type="button" disabled>ダウンロード</button>
            </div>
            <p class="secondary">変換できることを確認するとダウンロードできます。</p>
            <p id="output-message" role="status"></p>
            <noscript><p class="error">変換するにはブラウザーでJavaScriptを有効にしてください。</p></noscript>
        </section>
        <p id="announcement" role="status"></p>
        <section id="result" aria-labelledby="result-title" hidden>
            <h2 id="result-title">チェック結果</h2>
            <p id="summary"></p>
            <p class="secondary" id="checked-settings"></p>
            <ul id="issues" hidden></ul>
            <div id="preview" hidden>
                <p class="secondary" id="preview-count"></p>
                <div class="table-wrap" tabindex="0" role="region" aria-labelledby="preview-count">
                    <table><thead id="head"></thead><tbody id="body"></tbody></table>
                </div>
            </div>
        </section>
    </div>
    <x-ad-slot />
</x-layout>
