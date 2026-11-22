{{-- 合意済みUIの独立GET画面。入力はcalculation-tools.jsがブラウザー内で処理する。 --}}
<x-layout title="日常計算ツール" active="calculation-tools">
    <x-slot:head>
        @vite('resources/js/calculation-tools.js')
    </x-slot:head>

    <div class="calculation-tools">
        <section class="page-heading compact">
            <x-tool-back-link />
            <h1 class="tool-title">日常計算ツール</h1>
            <p class="lead">割合・割引・増減率・割り勘・単価比較を、必要な値だけで。</p>
        </section>
        <x-ad-slot />
<nav class="tabs" role="tablist" aria-label="計算の目的"><button id="ratio-tab" role="tab" aria-selected="true" aria-controls="ratio-panel">割合</button><button id="discount-tab" role="tab" aria-selected="false" aria-controls="discount-panel" tabindex="-1">割引</button><button id="change-tab" role="tab" aria-selected="false" aria-controls="change-panel" tabindex="-1">増減率</button><button id="split-tab" role="tab" aria-selected="false" aria-controls="split-panel" tabindex="-1">割り勘</button><button id="compare-tab" role="tab" aria-selected="false" aria-controls="compare-panel" tabindex="-1">単価比較</button></nav>
<noscript><p class="error">計算にはJavaScriptを有効にしてください。</p></noscript>
<section id="ratio-panel" class="card" role="tabpanel" aria-labelledby="ratio-tab"><h2>割合を計算</h2><form id="ratio-form" novalidate><fieldset disabled><label class="purpose">調べたいこと<select id="ratio-kind"><option value="percent">全体の何%か</option><option value="amount">何%分はいくつか</option></select></label><p class="hint" id="ratio-example">例：全体800のうち200は何%か。</p><div class="fields"><label><span>全体の値</span><input id="ratio-whole" type="text" inputmode="decimal" autocomplete="off" aria-describedby="ratio-note"></label><label><span id="ratio-part-label">一部の値</span><input id="ratio-part" type="text" inputmode="decimal" autocomplete="off" aria-describedby="ratio-note"></label></div><p class="hint" id="ratio-note">0以上、小数4桁まで。全体の何%かを調べるとき、全体は0より大きい値。</p><p id="ratio-error" class="error" role="alert"></p><button class="primary" type="submit">割合を計算</button></fieldset><div id="ratio-result" class="result" role="status" hidden></div></form></section>
<section id="discount-panel" class="card" role="tabpanel" aria-labelledby="discount-tab" hidden><h2>割引後の金額を計算</h2><p class="hint">例：1,980円の15%引きはいくらか。</p><form id="discount-form" novalidate><fieldset disabled><div class="fields"><label>元の金額（円）<input id="discount-price" type="text" inputmode="numeric" autocomplete="off"></label><label>割引率（%）<input id="discount-rate" type="text" inputmode="decimal" autocomplete="off"></label></div><p class="hint">金額は円単位の整数、割引率は0〜100%・小数2桁まで。割引額の1円未満は切捨て。</p><p id="discount-error" class="error" role="alert"></p><button class="primary" type="submit">割引後を計算</button></fieldset><div id="discount-result" class="result" role="status" hidden></div></form></section>
<section id="change-panel" class="card" role="tabpanel" aria-labelledby="change-tab" hidden><h2>増減率を計算</h2><p class="hint">例：800から1,000になったとき、何%増えたか。</p><form id="change-form" novalidate><fieldset disabled><div class="fields"><label>変更前の値（基準）<input id="change-before" type="text" inputmode="decimal" autocomplete="off"></label><label>変更後の値<input id="change-after" type="text" inputmode="decimal" autocomplete="off"></label></div><p class="hint">小数4桁まで。変更前は0より大きい値、変更後は0以上。</p><p id="change-error" class="error" role="alert"></p><button class="primary" type="submit">増減率を計算</button></fieldset><div id="change-result" class="result" role="status" hidden></div></form></section>
<section id="split-panel" class="card" role="tabpanel" aria-labelledby="split-tab" hidden><h2>割り勘を計算</h2><p class="hint">例：合計1,000円を3人で分ける。</p><form id="split-form" novalidate><fieldset disabled>
<label class="purpose">分け方<select id="split-kind"><option value="even">均等割り</option><option value="unit">支払い単位を選ぶ</option></select></label>
<div id="split-unit-fields" hidden>
    <label class="purpose">支払い単位<select id="split-unit"><option value="10">10円</option><option value="100">100円</option><option value="1000">1,000円</option></select></label>
    <p class="hint">基本額を指定単位で切り下げ、人数に含まれる1人が基本額と残額を払います。</p>
</div>
<div class="fields"><label>合計金額（円）<input id="split-total" type="text" inputmode="numeric" autocomplete="off"></label><label>人数（人）<input id="split-people" type="text" inputmode="numeric" autocomplete="off"></label></div><p class="hint">合計は円単位の整数、人数は1〜999人。割り切れない金額は残額として表示します。</p><p id="split-error" class="error" role="alert"></p><button class="primary" type="submit">1人分を計算</button></fieldset><div id="split-result" class="result" role="status" hidden></div></form></section>
<section id="compare-panel" class="card" role="tabpanel" aria-labelledby="compare-tab" hidden>
    <h2>買い物の単価を比較</h2>
    <form id="compare-form" novalidate>
        <fieldset disabled>
            <label class="purpose">比較する種類
                <select id="compare-kind"><option value="mass">重さ</option><option value="volume">容量</option><option value="count">個数</option></select>
            </label>
            <div class="fields">
                @foreach (['a' => 'A', 'b' => 'B'] as $key => $name)
                    <fieldset class="product">
                        <legend>商品{{ $name }}</legend>
                        <label>税込価格（円）<input id="compare-price-{{ $key }}" type="text" inputmode="numeric" autocomplete="off"></label>
                        <label>内容量<input id="compare-amount-{{ $key }}" type="text" inputmode="decimal" autocomplete="off" aria-describedby="compare-note"></label>
                        <label>単位<select id="compare-unit-{{ $key }}"><option value="g">g</option><option value="kg">kg</option></select></label>
                    </fieldset>
                @endforeach
            </div>
            <p class="hint" id="compare-note">価格は円単位の整数。重さ・容量は小数3桁まで、個数は整数です。内容量は0より大きい値を入力してください。</p>
            <p id="compare-error" class="error" role="alert"></p>
            <button class="primary" type="submit">単価を比較</button>
        </fieldset>
        <div id="compare-result" class="result" role="status" hidden></div>
    </form>
</section>
<p class="footnote">入力はこの画面だけで使用します。再読み込みすると消えます。</p><x-ad-slot />
    </div>
</x-layout>
