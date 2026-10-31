<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>名前を入力して挨拶を表示</title>
</head>
<body>
    <h1>名前を入力して挨拶を表示</h1>
    <form method="POST" action="{{ route('learning.greeting.submit') }}">
        @csrf
        <label for="name">名前（40文字以内）</label>
        <input id="name" name="name" type="text" maxlength="40" required
            value="{{ old('name', $name) }}" aria-describedby="name-error">
        <p id="name-error" role="status">@error('name'){{ $message }}@enderror</p>
        <button type="submit">挨拶を表示</button>
    </form>

    @if ($name !== null)
        <p id="greeting-result">こんにちは、{{ $name }}さん！</p>
    @endif
</body>
</html>
