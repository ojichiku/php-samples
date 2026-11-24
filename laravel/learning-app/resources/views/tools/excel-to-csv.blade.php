<x-layout title="Excel・ODSからCSVへ" active="excel-to-csv">
    <x-slot:head>
        @vite('resources/js/excel-to-csv.js')
    </x-slot:head>

    <header class="page-heading compact">
        <x-tool-back-link />
        <h1 class="tool-title">Excel・ODSからCSVへ</h1>
        <p class="lead">シートごとにCSVへ変換し、ZIPでまとめて保存します。入力ファイルはサーバーに送信されません。</p>
    </header>

    <x-ad-slot />
    <div class="excel-to-csv">
        <section class="panel" aria-labelledby="excel-input-title">
            <h2 id="excel-input-title">入力ファイル</h2>
            <p class="field-help" id="excel-input-help">対応形式は Excel（.xlsx）と ODS（.ods）です。1ファイル、最大5 MiB。</p>
            <div class="csv-file-row">
                <label class="button secondary csv-file-picker" for="excel-input">
                    <span id="excel-input-label">ファイルを選ぶ</span>
                    <input id="excel-input" type="file" accept=".xlsx,.ods" aria-labelledby="excel-input-label" aria-describedby="excel-input-help">
                </label>
                <p id="excel-input-name" role="status">ファイルが選択されていません</p>
            </div>
            <p id="excel-input-status" role="status"></p>
            <p id="excel-input-next" class="field-help" hidden>出力設定を確認し、プレビューを押してください。</p>
        </section>
        <section class="panel" aria-labelledby="excel-settings-title">
            <h2 id="excel-settings-title">出力設定</h2>
            <div class="csv-settings">
                <label>出力形式<input value="CSV" readonly></label>
                <label>文字コード
                    <select id="excel-encoding">
                        <option value="utf8">UTF-8</option>
                        <option value="bom">UTF-8（BOM付き）</option>
                        <option value="sjis">Shift_JIS</option>
                    </select>
                </label>
                <label>引用符
                    <select id="excel-quotes">
                        <option value="auto">必要なセルだけ囲む</option>
                        <option value="all">すべて囲む</option>
                        <option value="none">囲まない</option>
                    </select>
                </label>
            </div>
            <p id="excel-filenames"></p>
            <p id="excel-export-error" role="status"></p>
            <div class="csv-actions">
                <button class="button" id="excel-preview-button" type="button" disabled>プレビュー</button>
                <button class="button secondary" id="excel-download" type="button" disabled>ZIPをダウンロード</button>
            </div>
            <p id="excel-download-status" role="status"></p>
            <noscript><p>変換するにはJavaScriptを有効にしてください。</p></noscript>
        </section>
        <section class="panel" id="excel-preview" aria-labelledby="excel-preview-title" hidden>
            <h2 id="excel-preview-title">プレビュー</h2>
            <label>表示するシート <select id="excel-preview-sheet"></select></label>
            <p id="excel-range" role="status"></p>
            <p id="excel-preview-warning" class="field-help" hidden>式として解釈される可能性がある文字列も、そのまま出力します。出力を表計算ソフトで開く場合は、該当する列を文字列として読み込んでください。</p>
            <div class="csv-table" tabindex="0" role="region" aria-label="プレビュー表">
                <table><tbody id="excel-rows"></tbody></table>
            </div>
        </section>
        <section class="panel" id="excel-excluded" aria-labelledby="excel-excluded-title" hidden>
            <h2 id="excel-excluded-title">出力しないシート</h2>
            <ul id="excel-excluded-list"></ul>
        </section>
    </div>
    <x-ad-slot />
</x-layout>
