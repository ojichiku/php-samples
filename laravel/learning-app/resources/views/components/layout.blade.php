@props(['title', 'active' => 'tools'])
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="パスワード生成など、日々の作業に役立つ小さなツールを集めています。">
    <title>{{ $title }} | サンプルツール集</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <a class="skip-link" href="#main">本文へ移動</a>
    <header class="site-header">
        <div class="shell header-inner">
            <a class="brand" href="{{ route('tools.index') }}">
                <span class="brand-mark" aria-hidden="true">道具</span>
                <span>サンプルツール集</span>
            </a>
            <nav aria-label="共通メニュー">
                <a href="{{ route('tools.index') }}" @if($active === 'tools') aria-current="page" @endif>ツール一覧</a>
                <a href="{{ route('password.form') }}" @if($active === 'password') aria-current="page" @endif>パスワード生成</a>
                <a href="{{ route('calendar') }}" @if($active === 'calendar') aria-current="page" @endif>年間カレンダー</a>
                <a href="{{ route('password.browser') }}" @if($active === 'password-browser') aria-current="page" @endif>パスワード生成（JS版）</a>
                <a href="{{ route('date.tools') }}" @if($active === 'date-tools') aria-current="page" @endif>日付・元号</a>
                <a href="{{ route('text.tools') }}" @if($active === 'text-tools') aria-current="page" @endif>テキストツール</a>
            </nav>
        </div>
    </header>
    <main @class(['shell', 'calendar-shell' => $active === 'calendar', 'text-tools-shell' => $active === 'text-tools', 'date-tools-shell' => $active === 'date-tools', 'password-shell' => in_array($active, ['password', 'password-browser'], true)]) id="main">
        {{ $slot }}
    </main>
    <footer class="shell site-footer">
        <span>サンプルツール集</span>
        <a href="{{ route('tools.index') }}">ツール一覧に戻る</a>
    </footer>
</body>
</html>
