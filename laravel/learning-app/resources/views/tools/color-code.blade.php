{{-- HEXとRGBの変換、色見本、コピーはブラウザーで扱う。 --}}
<x-layout title="色コード変換" active="color-code">
    <x-slot:head>
        @vite('resources/js/color-code.js')
    </x-slot:head>

    <div class="color-code-tool">
        <header class="page-heading compact">
            <x-tool-back-link />
            <h1 class="tool-title">色コード変換</h1>
            <p class="lead">HEXまたはRGBの色コードを入力すると、色見本と両方の形式が表示されます。</p>
        </header>
        <x-ad-slot />

        <section class="color-code-fields" aria-label="色コードの入力と結果">
            <label for="color-input">色コード</label>
            <input id="color-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="color-hint color-error">
            <p id="color-hint" class="field-help">例 <code>#369</code>、<code>#336699</code>、<code>rgb(51, 102, 153)</code></p>
            <p id="color-error" class="color-code-error" role="alert" hidden></p>

            <h2>色見本</h2>
            <div id="color-swatch" class="color-code-swatch">
                <span id="color-swatch-hint">色コードを入力してください</span>
            </div>

            <h2 id="color-hex-label">HEX</h2>
            <pre id="color-hex" class="color-code-result" tabindex="-1" role="region" aria-labelledby="color-hex-label"></pre>
            <button id="color-copy-hex" class="button secondary" type="button" disabled>HEXをコピー</button>

            <h2 id="color-rgb-label">RGB</h2>
            <pre id="color-rgb" class="color-code-result" tabindex="-1" role="region" aria-labelledby="color-rgb-label"></pre>
            <button id="color-copy-rgb" class="button secondary" type="button" disabled>RGBをコピー</button>
            <p id="color-status" class="copy-status" role="status"></p>
            <noscript><p>変換するにはJavaScriptを有効にしてください。</p></noscript>
        </section>
        <x-ad-slot />
    </div>
</x-layout>
