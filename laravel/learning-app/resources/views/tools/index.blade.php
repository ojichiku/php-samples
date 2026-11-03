<x-layout title="ツール一覧">
    <section class="hero">
        <p class="eyebrow">日々の作業を、少し手軽に。</p>
        <h1>作業に役立つ、<br>小さなツール。</h1>
        <p class="lead">必要な道具を選んで、すぐに使えます。<br>使えるツールを、ここに少しずつ増やしていきます。</p>
    </section>
    <section aria-labelledby="tools-heading">
        <div class="section-heading"><h2 id="tools-heading">ツールを選ぶ</h2><span class="muted">2つのツールが利用できます</span></div>
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
                <p>一年分の日付・祝日・六曜・記念日を確認できます。過去や未来の年へ切り替えられます。</p>
                <a class="button" href="{{ route('calendar') }}">カレンダーを開く <span aria-hidden="true">→</span></a>
            </article>
            <article class="tool-card upcoming">
                <div class="card-top"><span class="tool-icon" aria-hidden="true">◎</span><span class="badge neutral">準備中</span></div>
                <h3>所有者用メニュー</h3>
                <p>所有者だけがログインして使う管理機能を準備しています。一般向けの登録はありません。</p>
                <p class="card-note">まだ利用できません</p>
            </article>
        </div>
    </section>
</x-layout>
