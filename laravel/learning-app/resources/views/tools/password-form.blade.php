<x-layout title="パスワード生成" active="password">
    <section class="page-heading compact">
        <a class="back-link" href="{{ route('tools.index') }}">← ツール一覧</a>
        <p class="eyebrow">PASSWORD GENERATOR</p>
        <h1>パスワード生成</h1>
        <p class="lead">8〜64文字の範囲で、文字数と使う文字を選んで生成できます。</p>
    </section>
    <p class="field-help">生成処理はサーバーで行い、結果をこのページに表示します。生成値をアプリのデータベースや履歴に保存する機能はありません。</p>
    <p class="browser-ad-notice">この画面は広告を読み込むため外部通信が発生します。同じページで第三者スクリプトが動作し、生成値を第三者コードから隔離する構成ではありません。</p>
    <x-ad-slot />
    <div id="server-password-tool">
        <div class="generator-grid">
            <section class="panel" aria-labelledby="settings-heading">
                <h2 id="settings-heading">生成する条件</h2>
                @if ($errors->any())
                    <div class="error-box" role="alert" tabindex="-1">
                        <p>入力内容を確認してください。</p>
                        <ul>@foreach ($errors->all() as $message)<li>{{ $message }}</li>@endforeach</ul>
                    </div>
                @endif
                <form method="POST" action="{{ route('password.generate') }}">
                    @csrf
                    <div class="form-field">
                        <label for="password-length">文字数</label>
                        <div class="length-row"><input id="password-length" name="length" type="number" min="8" max="64" step="1" value="{{ $length }}" required aria-describedby="length-help" @error('length') aria-invalid="true" @enderror><span>文字</span></div>
                        <p class="field-help" id="length-help">8～64文字で指定できます。</p>
                    </div>
                    <fieldset class="form-field">
                        <legend>使用する文字種</legend>
                        <p class="field-help" id="groups-help">1つ以上選択。選んだ種類を最低1文字ずつ含めます。</p>
                        <div class="character-options" aria-describedby="groups-help">
                            <label><input type="checkbox" name="groups[]" value="lowercase" @checked(in_array('lowercase', $groups, true))><span>英小文字<small>a～z</small></span></label>
                            <label><input type="checkbox" name="groups[]" value="uppercase" @checked(in_array('uppercase', $groups, true))><span>英大文字<small>A～Z</small></span></label>
                            <label><input type="checkbox" name="groups[]" value="numbers" @checked(in_array('numbers', $groups, true))><span>数字<small>0～9</small></span></label>
                            <label><input type="checkbox" name="groups[]" value="symbols" @checked(in_array('symbols', $groups, true))><span>記号<small>! # $ % など</small></span></label>
                        </div>
                    </fieldset>
                    <button class="button full-width" type="submit">パスワードを生成 <span aria-hidden="true">→</span></button>
                </form>
            </section>
            <section class="panel result-panel" aria-labelledby="result-heading">
                <h2 id="result-heading">生成したパスワード</h2>
                <label class="field-help" for="generated-password">生成結果</label>
                <textarea id="generated-password" rows="3" readonly autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="生成すると、ここに表示します。">{{ $password }}</textarea>
                <button class="button secondary full-width" id="copy-password" type="button" @disabled($password === null)>コピーする</button>
                <p class="copy-status" id="copy-status" role="status" aria-live="polite"></p>
                <p class="field-help">生成値を保存する機能はありません。画面を移動すると結果は消えます。</p>
            </section>
        </div>
        <section class="panel browser-password-guide" aria-labelledby="server-usage-heading">
            <h2 id="server-usage-heading">使い方と注意点</h2>
            <ol class="steps"><li>文字数と使う文字種を選びます。</li><li>「パスワードを生成」を押します。</li><li>結果を確認し、「コピーする」でコピーします。</li></ol>
            <p>利用先の文字数・使用できる記号の条件に合わせて設定してください。</p>
            <p>必要な値は画面を閉じる前にコピーし、ご自身の管理方法で保管してください。コピーした値はクリップボードに残る場合があります。共用端末や貼り付け先に注意してください。</p>
        </section>
    </div>
    <x-ad-slot />
</x-layout>
