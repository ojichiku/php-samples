{{-- 入力・変換・保存はブラウザー内で処理する。 --}}
<x-layout title="YAMLチェック・JSON変換" active="yaml-tools">
    <x-slot:head>
        @vite('resources/js/yaml-tools.js')
    </x-slot:head>

    <header class="page-heading compact">
        <x-tool-back-link />
        <h1 class="tool-title">YAMLチェック・JSON変換</h1>
        <p class="lead">YAMLのチェック・整形とJSONへの変換を行います。入力はこのブラウザー内で処理します。</p>
    </header>
    <x-ad-slot />
    <div class="json-tools yaml-tools">
        <section class="panel" aria-labelledby="yaml-input-title">
            <h2 id="yaml-input-title">入力・操作</h2>
            <label for="yaml-format">入力形式</label>
            <select id="yaml-format" disabled>
                <option value="yaml">YAML</option>
                <option value="json">JSON</option>
            </select>
            <label class="button secondary json-file-picker">
                ファイルを選ぶ
                <input id="yaml-file" type="file" accept=".yaml,.yml" aria-label="入力ファイルを選ぶ" aria-describedby="yaml-file-status" disabled>
            </label>
            <p id="yaml-file-status" class="field-help" role="status">.yaml・.yml、UTF-8、1 MiBまで。</p>
            <label for="yaml-text">入力</label>
            <textarea id="yaml-text" spellcheck="false" wrap="off"></textarea>
            <label for="yaml-operation">処理</label>
            <select id="yaml-operation" aria-describedby="yaml-operation-help" disabled>
                <option value="check">構文チェック</option>
            </select>
            <p id="yaml-operation-help" class="field-help"></p>
            <div id="yaml-indent-panel" hidden>
                <label for="yaml-indent">字下げ</label>
                <select id="yaml-indent" disabled>
                    <option value="2">半角スペース2個</option>
                    <option value="4">半角スペース4個</option>
                </select>
            </div>
            <div class="json-actions">
                <button class="button" id="yaml-run" type="button" disabled>実行</button>
                <button class="button secondary" id="yaml-clear" type="button" disabled>入力と結果をクリア</button>
            </div>
            <noscript><p>処理するにはJavaScriptを有効にしてください。</p></noscript>
        </section>
        <section class="panel" aria-labelledby="yaml-result-title">
            <h2 id="yaml-result-title">結果</h2>
            <p id="yaml-status" role="status">処理を実行すると結果が表示されます。</p>
            <textarea id="yaml-output" aria-label="出力" wrap="off" readonly hidden></textarea>
            <div class="json-actions">
                <button class="button secondary" id="yaml-copy" type="button" disabled>コピー</button>
                <button class="button secondary" id="yaml-download" type="button" disabled>ダウンロード</button>
            </div>
            <p id="yaml-action-status" role="status"></p>
        </section>
    </div>
    <x-ad-slot />
</x-layout>
