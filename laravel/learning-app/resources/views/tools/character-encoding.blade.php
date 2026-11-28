{{-- ファイルの読み込みと保存データの作成はブラウザー内で行う。 --}}
<x-layout title="文字コード・改行変換" active="character-encoding">
    <x-slot:head>
        @vite('resources/js/character-encoding.js')
    </x-slot:head>

    <div class="character-encoding">
        <header class="page-heading compact">
            <x-tool-back-link />
            <h1 class="tool-title">文字コード・改行変換</h1>
            <p class="lead">テキストファイルの文字コードと改行を確認し、変更したファイルを保存できます。</p>
        </header>
        <x-ad-slot />

        <section class="encoding-fields" aria-label="ファイル変換">
            <label for="encoding-file">テキストファイル</label>
            <input type="file" id="encoding-file" aria-describedby="encoding-file-hint">
            <p id="encoding-file-hint">1ファイル、5 MiBまで。</p>

            <label for="encoding-source">元の文字コード</label>
            <select id="encoding-source" aria-describedby="encoding-source-error">
                <option value="utf8">UTF-8（BOMの有無を含む）</option>
                <option value="cp932">Shift_JIS（Windows-31J／CP932）</option>
            </select>
            <p id="encoding-source-error" class="encoding-error" role="alert" hidden></p>

            <h2 id="encoding-preview-heading">元の文字と改行</h2>
            <p id="encoding-bom" hidden></p>
            <p id="encoding-newline-summary" hidden></p>
            <pre id="encoding-preview" tabindex="0" aria-labelledby="encoding-preview-heading">ファイルを選んでください。</pre>
            <p id="encoding-preview-hint" hidden>プレビューは先頭10行・1,000文字までです。ファイル全体を変換します。</p>

            <label for="encoding-target">保存する文字コード</label>
            <select id="encoding-target" aria-describedby="encoding-target-error">
                <option value="utf8">UTF-8</option>
                <option value="utf8-bom">UTF-8（BOM付き）</option>
                <option value="cp932">Shift_JIS（Windows-31J／CP932）</option>
            </select>
            <p id="encoding-target-error" class="encoding-error" role="alert" hidden></p>
            <ul id="encoding-target-issues" class="encoding-issues" aria-label="CP932で保持できない文字" hidden></ul>
            <p id="encoding-target-omitted" hidden></p>

            <label for="encoding-newline">保存する改行</label>
            <select id="encoding-newline">
                <option value="lf">LF</option>
                <option value="crlf">CRLF</option>
            </select>

            <p id="encoding-filename" hidden></p>
            <button id="encoding-download" class="button" type="button" aria-describedby="encoding-target-error" disabled>ダウンロード</button>
            <p id="encoding-status" role="status"></p>
            <noscript><p>変換するにはJavaScriptを有効にしてください。</p></noscript>
        </section>
        <x-ad-slot />
    </div>
</x-layout>
