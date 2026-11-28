{{-- 基数と整数を選び、ブラウザーで算出した結果をコピーする。 --}}
<x-layout title="基数変換" active="radix-converter">
    <x-slot:head>
        @vite('resources/js/radix-converter.js')
    </x-slot:head>

    <div class="radix-converter">
        <header class="page-heading compact">
            <x-tool-back-link />
            <h1 class="tool-title">基数変換</h1>
            <p class="lead">2〜36進数の整数を、別の基数に変換します。</p>
        </header>
        <x-ad-slot />

        <section class="radix-fields" aria-label="基数変換">
            @foreach ([['id' => 'input', 'label' => '入力', 'default' => 10], ['id' => 'output', 'label' => '出力', 'default' => 16]] as $side)
                <label for="radix-{{ $side['id'] }}-base">{{ $side['label'] }}の基数</label>
                <select id="radix-{{ $side['id'] }}-base">
                    @foreach ([2, 8, 10, 16] as $base)
                        <option value="{{ $base }}" @selected($base === $side['default'])>{{ $base }}進</option>
                    @endforeach
                    <option value="custom">その他（基数を入力）</option>
                </select>
                <div id="radix-{{ $side['id'] }}-custom-field" class="radix-custom" hidden>
                    <label for="radix-{{ $side['id'] }}-custom">{{ $side['label'] }}の基数（2〜36）</label>
                    <input id="radix-{{ $side['id'] }}-custom" type="text" inputmode="numeric" autocomplete="off" aria-describedby="radix-{{ $side['id'] }}-custom-error" disabled />
                    <p id="radix-{{ $side['id'] }}-custom-error" class="radix-error" role="alert" hidden></p>
                </div>
                @if ($side['id'] === 'input')
                    <label for="radix-integer">整数</label>
                    <textarea id="radix-integer" rows="2" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="例　255" aria-describedby="radix-integer-error"></textarea>
                    <p id="radix-integer-error" class="radix-error" role="alert" hidden></p>
                @endif
            @endforeach

            <h2 id="radix-result-title">結果</h2>
            <pre id="radix-result" tabindex="0" role="region" aria-labelledby="radix-result-title"></pre>
            <button id="radix-copy" class="button secondary" type="button" disabled>コピー</button>
            <p id="radix-status" class="copy-status" role="status"></p>
            <noscript><p>変換するにはJavaScriptを有効にしてください。</p></noscript>
        </section>
        <x-ad-slot />
    </div>
</x-layout>
