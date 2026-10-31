<x-layout title="パスワード生成の使い方" active="password">
    <section class="page-heading">
        <a class="back-link" href="{{ route('tools.index') }}">← ツール一覧</a>
        <p class="eyebrow">PASSWORD GENERATOR</p>
        <h1>使う文字を選んで、<br>パスワードを生成。</h1>
        <p class="lead">8～64文字の範囲で、小文字・大文字・数字・記号を組み合わせられます。</p>
        <a class="button" href="{{ route('password.form') }}">パスワードを生成する <span aria-hidden="true">→</span></a>
    </section>
    <section class="panel prose" aria-labelledby="usage-heading">
        <h2 id="usage-heading">使い方</h2>
        <ol class="steps"><li>生成画面で文字数を入力します。</li><li>使う文字種を1つ以上選びます。選んだ文字種は、それぞれ最低1文字含まれます。</li><li>「生成する」を押して結果を確認し、「コピーする」でコピーします。</li></ol>
        <h2>利用するときの注意</h2>
        <p>登録するサービスの文字数・使用できる記号の条件に合わせて選んでください。このツールで選べる範囲が、すべてのサービスに対応するわけではありません。</p>
        <p>生成値はアプリのデータベースや履歴に保存しません。生成処理はサーバーで行い、結果を画面に返します。必要な値は画面を閉じる前にコピーしてください。</p>
        <p>コピーした値は端末のクリップボードに入ります。共用端末での利用や貼り付け先には注意してください。</p>
    </section>
</x-layout>
