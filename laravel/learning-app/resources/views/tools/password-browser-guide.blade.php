<x-layout title="ブラウザー版パスワード生成の使い方" active="password-browser">
    <section class="page-heading">
        <a class="back-link" href="{{ route('tools.index') }}">← ツール一覧</a>
        <p class="eyebrow">BROWSER PASSWORD GENERATOR</p>
        <h1>この端末で、<br>まとめて生成。</h1>
        <p class="lead">8〜128文字のパスワードを、1回に1〜100件生成できます。</p>
        <a class="button" href="{{ route('password.browser') }}">ブラウザーで生成する <span aria-hidden="true">→</span></a>
    </section>
    <section class="panel prose" aria-labelledby="browser-usage-heading">
        <h2 id="browser-usage-heading">使い方</h2>
        <ol class="steps">
            <li>文字数と発行数を指定します。</li>
            <li>小文字・大文字・数字・記号から使う文字種を選びます。記号はプリセットか直接入力で指定できます。</li>
            <li>生成した結果を確認し、まとめてコピーします。</li>
        </ol>
        <h2>生成画面では端末内で処理します</h2>
        <p>生成・コピーの処理自身には生成値の送信処理がなく、アプリのデータベース、履歴、ブラウザーの保存領域へ保存する機能もありません。生成画面にも広告を掲載するため、ページ全体では外部通信が発生します。同じページの第三者スクリプトから生成値を隔離する構成ではありません。</p>
        <h2>利用するときの注意</h2>
        <p>サービスの文字数や記号の条件に合わせて設定してください。コピーした値は端末のクリップボードに入るため、共用端末や貼り付け先に注意してください。</p>
        <p>JavaScriptと安全な乱数生成機能を利用できるブラウザーが必要です。必要な値は生成画面を閉じる前にコピーしてください。</p>
    </section>
    <x-ad-slot />
</x-layout>
