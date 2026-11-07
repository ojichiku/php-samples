<x-layout title="ツール一覧">
    <section class="hero">
        <p class="eyebrow">日々の作業を、少し手軽に。</p>
        <h1>作業に役立つ、<br>小さなツール。</h1>
        <p class="lead">必要な道具を選んで、すぐに使えます。<br>使えるツールを、ここに少しずつ増やしていきます。</p>
    </section>
    <x-ad-slot />
    <section aria-labelledby="tools-heading">
        <div class="section-heading"><h2 id="tools-heading">ツールを選ぶ</h2><span class="muted">4つのツールが利用できます</span></div>
        <div class="tool-grid">
            <article class="tool-card available">
                <div class="card-top"><span class="tool-icon" aria-hidden="true">Aa</span><span class="badge">利用できます</span></div>
                <h3>パスワード生成</h3>
                <p>文字数と使う文字を選んで、パスワードを生成します。生成した値をコピーできます。</p>
                <a class="button" href="{{ route('password.guide') }}">使い方を見る <span aria-hidden="true">→</span></a>
            </article>
            <article class="tool-card available">
                <div class="card-top"><span class="tool-icon" aria-hidden="true">31</span><span class="badge">利用できます</span></div>
                <h3>年間カレンダー</h3>
                <p>一年分の日付・祝日・六曜を確認できます。過去や未来の年へ切り替えられます。</p>
                <a class="button" href="{{ route('calendar') }}">カレンダーを開く <span aria-hidden="true">→</span></a>
            </article>
            <article class="tool-card available">
                <div class="card-top"><span class="tool-icon" aria-hidden="true">Aa+</span><span class="badge">利用できます</span></div>
                <h3>ブラウザーでパスワード生成</h3>
                <p>この端末で複数のパスワードを生成します。利用できる記号の直接入力やプリセットを選べます。</p>
                <a class="button" href="{{ route('password.browser.guide') }}">ブラウザー版の使い方 <span aria-hidden="true">→</span></a>
            </article>
            <article class="tool-card available">
                <div class="card-top"><span class="tool-icon" aria-hidden="true">T</span><span class="badge">利用できます</span></div>
                <h3>テキスト便利ツール集</h3>
                <p>文字数・整形・置換・行整理・文字変換と、正規表現の一致確認・サンプル生成ができます。</p>
                <a class="button" href="{{ route('text.tools') }}">テキストツールを開く <span aria-hidden="true">→</span></a>
            </article>
            <article class="tool-card upcoming">
                <div class="card-top"><span class="tool-icon" aria-hidden="true">◎</span><span class="badge neutral">準備中</span></div>
                <h3>所有者用メニュー</h3>
                <p>所有者だけがログインして使う管理機能を準備しています。一般向けの登録はありません。</p>
                <p class="card-note">まだ利用できません</p>
            </article>
        </div>
    </section>
    <x-ad-slot />
</x-layout>
