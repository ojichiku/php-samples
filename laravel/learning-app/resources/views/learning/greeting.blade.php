{{-- GreetingControllerが渡す$nameを表示する学習画面。nullなら挨拶結果は表示しない。 --}}
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>名前を入力して挨拶を表示</title>
</head>
<body>
    <h1>名前を入力して挨拶を表示</h1>
    {{-- 名前を検証するPOSTのRouteへ送信する。@csrfは送信元の検証に使うトークンを埋め込む。 --}}
    <form method="POST" action="{{ route('learning.greeting.submit') }}">
        @csrf
        <label for="name">名前（40文字以内）</label>
        {{-- 検証エラー後はoldの入力値を優先し、通常はControllerからの値を使う。 --}}
        <input id="name" name="name" type="text" maxlength="40" required
            value="{{ old('name', $name) }}" aria-describedby="name-error">
        {{-- nameの検証エラーがある場合だけ、Laravelのメッセージを表示する。 --}}
        <p id="name-error" role="status">@error('name'){{ $message }}@enderror</p>
        <button type="submit">挨拶を表示</button>
    </form>

    {{-- {{ }}は名前をHTMLとして解釈させず表示する。未入力の初回画面では結果を出さない。 --}}
    @if ($name !== null)
        <p id="greeting-result">こんにちは、{{ $name }}さん！</p>
    @endif
</body>
</html>
