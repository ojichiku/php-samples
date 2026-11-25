{{-- 計算・メモリ・履歴はこのブラウザー内で扱う。 --}}
<x-layout title="一般電卓" active="general-calculator">
    <x-slot:head>
        @vite('resources/js/general-calculator.js')
    </x-slot:head>

    <header class="page-heading compact">
        <x-tool-back-link />
        <h1 class="tool-title">一般電卓</h1>
        <p class="lead">式を入力するか、画面のキーを押して計算できます。入力内容は計算のためにサーバーへ送りません。</p>
    </header>
    <x-ad-slot />
    <noscript><p>計算するにはJavaScriptを有効にしてください。</p></noscript>
    <div class="calculator" id="calculator" inert>
        <section class="display" aria-label="式と計算結果">
            <div class="expression-label">
                <label for="expression">式</label>
                <div class="cursor-controls">
                    <button type="button" id="cursor-left" aria-label="カーソルを左へ" disabled>←</button>
                    <button type="button" id="cursor-right" aria-label="カーソルを右へ" disabled>→</button>
                </div>
            </div>
            <input id="expression" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="例  1200 * 1.1" aria-describedby="feedback">
            <div class="result" aria-live="polite" aria-atomic="true">
                <span>結果</span>
                <output id="result" for="expression">—</output>
                <small id="approximation" hidden>近似値</small>
            </div>
            <p id="feedback" class="feedback" role="status" hidden></p>
            <div class="actions">
                <button type="button" id="copy" disabled>結果をコピー</button>
                <button type="button" id="restore" disabled>直前の式に戻す</button>
            </div>
        </section>
        <section class="controls" aria-label="基本キー">
            <div class="keys" aria-label="基本キー" role="group">
                <button type="button" class="operator" data-key="percent" aria-label="パーセント">%</button>
                <button type="button" class="operator" data-value="^" aria-label="べき乗">xʸ</button>
                <button type="button" class="operator clear-key" id="clear" disabled>式をクリア</button>
                <button type="button" class="operator" id="backspace" aria-label="1文字削除" disabled>⌫</button>
                <button type="button" class="operator" data-value="(" aria-label="開き括弧">(</button>
                <button type="button" class="operator" data-value=")" aria-label="閉じ括弧">)</button>
                <button type="button" class="operator" data-function="sqrt" aria-label="平方根">√</button>
                <button type="button" class="operator" data-value="/" aria-label="割る">÷</button>
                <button type="button" data-value="7">7</button>
                <button type="button" data-value="8">8</button>
                <button type="button" data-value="9">9</button>
                <button type="button" class="operator" data-value="*" aria-label="掛ける">×</button>
                <button type="button" data-value="4">4</button>
                <button type="button" data-value="5">5</button>
                <button type="button" data-value="6">6</button>
                <button type="button" class="operator" data-value="-" aria-label="引く">−</button>
                <button type="button" data-value="1">1</button>
                <button type="button" data-value="2">2</button>
                <button type="button" data-value="3">3</button>
                <button type="button" class="operator" data-value="+" aria-label="足す">+</button>
                <button type="button" data-value="0">0</button>
                <button type="button" data-value="." aria-label="小数点">.</button>
                <button type="button" class="equals" id="calculate" aria-label="計算する" disabled>=</button>
            </div>
        </section>
        <div class="support">
            <details class="fold functions" id="functions">
                <summary>関数キー <span id="angle-indicator">度 DEG</span></summary>
                <div class="function-panel">
                    <fieldset class="angle">
                        <legend>三角関数の角度単位</legend>
                        <div class="angle-options">
                            <label><input type="radio" name="angle" value="DEG" checked><span>度 DEG</span></label>
                            <label><input type="radio" name="angle" value="RAD"><span>ラジアン RAD</span></label>
                        </div>
                    </fieldset>
                    <div class="keys function-keys" aria-label="関数キー" role="group">
                        <button type="button" data-function="sin">sin</button>
                        <button type="button" data-function="cos">cos</button>
                        <button type="button" data-function="tan">tan</button>
                        <button type="button" data-value="pi" aria-label="円周率">π</button>
                        <button type="button" data-function="log" aria-label="log 常用対数">log</button>
                        <button type="button" data-function="ln" aria-label="ln 自然対数">ln</button>
                        <button type="button" data-function="abs" aria-label="絶対値">|x|</button>
                    </div>
                </div>
            </details>
            <div class="memory">
                <p id="memory-value" role="status">メモリ <span>なし</span></p>
                <div class="actions" aria-label="メモリ操作" role="group">
                    <button type="button" id="memory-save" aria-label="メモリに保存" disabled>保存</button>
                    <button type="button" id="memory-recall" aria-label="メモリから呼び出す" disabled>呼び出す</button>
                    <button type="button" id="memory-clear" aria-label="メモリを消去" disabled>消去</button>
                </div>
                <p class="memory-help">結果の数値を1件保存し、別の式に入れられます。</p>
            </div>
        </div>
        <details class="fold history">
            <summary>計算履歴 <span id="history-count">0件</span></summary>
            <div class="history-content">
                <p id="history-empty">計算に成功すると、式と結果が最新20件まで自動で記録されます。</p>
                <div class="history-header" id="history-actions" hidden>
                    <p>式を選ぶと、計算時の角度単位で呼び戻せます。</p>
                    <button type="button" id="history-clear" disabled>履歴を消去</button>
                </div>
                <ol id="history" aria-label="最近の計算"></ol>
            </div>
        </details>
    </div>
    <p class="percent-help">％は値を100で割ります。<code>10%</code> → <code>0.1</code>、<code>200*10%</code> → <code>20</code>、<code>200+10%</code> → <code>200.1</code>。200の10％増は <code>200*(1+10%)</code> → <code>220</code> です。</p>
    <x-ad-slot />
</x-layout>
