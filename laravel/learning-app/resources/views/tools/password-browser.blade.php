<x-layout title="ブラウザーでパスワード生成" active="password-browser">
    <section class="page-heading compact">
        <a class="back-link" href="{{ route('tools.index') }}">← ツール一覧</a>
        <p class="eyebrow">この端末で生成。送信・保存なし。</p>
        <h1>ブラウザーでパスワード生成</h1>
        <p class="lead">文字数・発行数・使える記号を選び、まとめて生成できます。使い方と結果を、この画面にまとめました。</p>
    </section>
    <div id="browser-password-tool">
        <noscript><p class="error-box">生成にはJavaScriptが必要です。パスワードをサーバーで生成することはありません。</p></noscript>
        <div class="generator-grid">
            <section class="panel" aria-labelledby="browser-settings-heading">
                <h2 id="browser-settings-heading">生成する条件</h2>
                <div id="browser-password-error" class="error-box" role="alert" tabindex="-1" hidden></div>
                <div class="browser-number-fields">
                    <div class="form-field"><label for="browser-length">文字数</label><div class="length-row"><input id="browser-length" type="number" value="16" min="8" max="128" step="1" autocomplete="off"><span>文字</span></div><p class="field-help">8〜128文字</p></div>
                    <div class="form-field"><label for="browser-count">発行数</label><div class="length-row"><input id="browser-count" type="number" value="1" min="1" max="100" step="1" autocomplete="off"><span>件</span></div><p class="field-help">1〜100件</p></div>
                </div>
                <fieldset class="form-field"><legend>使用する文字種</legend><p class="field-help">選んだ文字種を、それぞれ最低1文字含めます。</p>
                    <div class="character-options">
                        <label><input type="checkbox" data-character-group value="lowercase" checked><span>英小文字<small>a〜z</small></span></label>
                        <label><input type="checkbox" data-character-group value="uppercase" checked><span>英大文字<small>A〜Z</small></span></label>
                        <label><input type="checkbox" data-character-group value="numbers" checked><span>数字<small>0〜9</small></span></label>
                        <label><input type="checkbox" data-character-group value="symbols"><span>記号<small>下の条件で指定</small></span></label>
                    </div>
                </fieldset>
                <div class="form-field"><label for="browser-symbol-mode">記号の指定方法</label>
                    <select id="browser-symbol-mode" disabled><option value="basic" selected>基本の10記号（!@#$%&amp;*+-_）</option><option value="minimal">ハイフン・アンダースコア（-_）</option><option value="all">すべての半角ASCII記号（32種）</option><option value="custom">利用できる記号を直接入力</option></select>
                    <div id="browser-custom-field" hidden><label for="browser-custom-symbols">利用できる記号</label><input id="browser-custom-symbols" type="text" value="!@#" maxlength="128" autocomplete="off" autocapitalize="off" spellcheck="false" disabled><p class="field-help">半角記号のみ。重複した記号は1つとして扱います。</p></div>
                    <p class="field-help browser-symbol-preview" id="browser-symbol-preview"></p>
                </div>
                <button class="button full-width" id="browser-generate" type="button" disabled>パスワードを生成</button>
            </section>
            <section class="panel" aria-labelledby="browser-result-heading">
                <h2 id="browser-result-heading">生成したパスワード</h2>
                <p class="field-help" id="browser-password-empty">条件を選び、「パスワードを生成」を押してください。</p>
                <textarea id="browser-all-results" aria-label="全件のパスワード" readonly autocomplete="off" autocapitalize="off" spellcheck="false" rows="4" hidden></textarea>
                <div class="browser-result-actions"><button class="button secondary" type="button" id="browser-copy-all" disabled>全件コピー</button><button class="button secondary" type="button" id="browser-clear" disabled>結果を消す</button></div>
                <p class="copy-status" id="browser-password-status" role="status" aria-live="polite"></p>
                <p class="field-help">生成値はサーバーへ送信せず、保存しません。条件変更・画面移動で結果は消えます。コピーした値はクリップボードに残る場合があります。</p>
            </section>
        </div>
        <section class="panel browser-password-guide"><h2>使い方と注意点</h2><ol class="steps"><li>文字数・発行数・使う文字種を選びます。</li><li>記号を使う場合は、利用先が認める記号を選択または入力します。</li><li>生成後、テキストエリアに全件を表示します。「全件コピー」または必要な行を選択してコピーします。</li></ol><p>生成にはブラウザーの暗号用途の乱数を使います。利用先のパスワード要件も確認してください。同じパスワードを複数のサービスで使い回さないでください。</p><p>このアプリに保存機能はありません。必要なパスワードは、ご自身のパスワード管理方法で保管してください。</p></section>
    </div>
</x-layout>
