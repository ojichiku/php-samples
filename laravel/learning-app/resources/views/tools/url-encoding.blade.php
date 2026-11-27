{{-- URLの入力と変換結果はブラウザーのJavaScriptが扱う。 --}}
<x-layout title="URLエンコード・デコード" active="url-encoding">
    <x-slot:head>
        @vite('resources/js/url-encoding.js')
    </x-slot:head>

    <div class="url-encoding">
        <header class="page-heading compact">
            <x-tool-back-link />
            <h1 class="tool-title">URLエンコード・デコード</h1>
            <p class="lead">URLのパス1区間やクエリの値1件を変換します。</p>
        </header>
        <x-ad-slot />

        <section class="url-fields" aria-label="URL変換">
            <label for="url-format">形式</label>
            <select id="url-format">
                <option value="component">URL部品（空白を %20 にする）</option>
                <option value="form">フォーム値（空白を + にする）</option>
            </select>
            <label for="url-input">入力</label>
            <textarea id="url-input" rows="3" spellcheck="false" placeholder="例　東京 +" aria-describedby="url-error"></textarea>
            <p id="url-error" class="url-error" role="alert" hidden></p>
            <div class="url-actions">
                <button id="url-encode" class="button" type="button" disabled>エンコード</button>
                <button id="url-decode" class="button" type="button" disabled>デコード</button>
            </div>
            <h2 id="url-result-title">結果</h2>
            <pre id="url-result" tabindex="0" role="region" aria-labelledby="url-result-title"></pre>
            <button id="url-copy" class="button secondary" type="button" disabled>コピー</button>
            <p id="url-status" class="copy-status" role="status"></p>
            <noscript><p>変換するにはJavaScriptを有効にしてください。</p></noscript>
        </section>
        <x-ad-slot />
    </div>
</x-layout>
