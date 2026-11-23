<x-layout title="JSONチェック・ファイル変換" active="json-tools">
    <x-slot:head>
        @vite('resources/js/json-tools.js')
    </x-slot:head>

    <header class="page-heading compact">
        <x-tool-back-link />
        <h1 class="tool-title">JSONチェック・ファイル変換</h1>
        <p class="lead">入力はこのブラウザー内で処理します。</p>
    </header>

    <div class="json-tools">
        <section class="panel" aria-labelledby="json-input-title">
            <h2 id="json-input-title">入力・操作</h2>
            <label for="json-format">入力形式</label>
            <select id="json-format" disabled>
                <option value="json">JSON</option>
                <option value="schema">JSON Schema</option>
                <option value="jsonl">JSONL</option>
            </select>
            <label for="json-operation">処理</label>
            <select id="json-operation" disabled>
                <option value="check">構文チェック</option>
            </select>
            <div>
                <label id="json-text-label" for="json-text">JSON入力</label>
                <label class="button secondary json-file-picker">
                    ファイルを選ぶ
                    <input id="json-file" type="file" accept=".json" aria-label="入力ファイルを選ぶ" aria-describedby="json-file-status" disabled>
                </label>
                <p id="json-file-status" class="field-help" role="status">UTF-8、1 MiBまで。</p>
                <textarea id="json-text" spellcheck="false"></textarea>
            </div>
            <div id="json-schema-panel" hidden>
                <label for="json-schema">照合するJSON Schema</label>
                <label class="button secondary json-file-picker">
                    ファイルを選ぶ
                    <input id="json-schema-file" type="file" accept=".json" aria-label="スキーマファイルを選ぶ" aria-describedby="json-schema-file-status" disabled>
                </label>
                <p id="json-schema-file-status" class="field-help" role="status">Draft 2020-12、UTF-8、1 MiBまで。</p>
                <textarea id="json-schema" spellcheck="false"></textarea>
            </div>
            <div class="json-actions">
                <button class="button" id="json-run" type="button" disabled>実行</button>
                <button class="button secondary" id="json-clear" type="button" disabled>入力と結果をクリア</button>
            </div>
            <noscript><p>処理するにはJavaScriptを有効にしてください。</p></noscript>
        </section>
        <section class="panel" aria-labelledby="json-result-title">
            <h2 id="json-result-title">結果</h2>
            <p id="json-status" role="status">処理を実行すると結果が表示されます。</p>
            <p id="json-note" class="field-help" hidden></p>
            <textarea id="json-output" aria-label="出力" readonly hidden></textarea>
            <div class="json-table" id="json-preview" role="region" aria-label="CSVプレビュー" tabindex="0" hidden>
                <table><thead id="json-preview-head"></thead><tbody id="json-preview-body"></tbody></table>
            </div>
            <div class="json-actions">
                <button class="button secondary" id="json-copy" type="button" disabled>コピー</button>
                <button class="button secondary" id="json-download" type="button" disabled>ダウンロード</button>
            </div>
            <p id="json-action-status" role="status"></p>
        </section>
    </div>
    <x-ad-slot />
</x-layout>
