# Laravel Learning App

Laravelで小さな画面と入力処理を学ぶサンプルアプリです。
Hello World、名前を入力するフォーム、共通メニュー、パスワード生成ツール、年間カレンダーを含みます。

## 必要なもの

- PHP 8.3以上と、`composer.lock`の依存要件を満たすPHP拡張
- Composer
- Node.js（使用する版は`.nvmrc`を参照）とnpm
- SQLiteを利用できるPHP環境

PHP拡張などの不足は、依存導入後に`composer check-platform-reqs`で確認できます。
DBや接続先を独自に用意せずに動かせるよう、`.env.example`はローカルのSQLiteを既定にしています。

## 初回セットアップ

このREADMEと同じ、`laravel/learning-app`フォルダーで実行します。
PHP・Composer・Node.js・npmを用意してから進めてください。
以下はPOSIX互換シェルでの例です。

```bash
composer install
cp .env.example .env
php artisan key:generate
php -r "file_exists('database/database.sqlite') || touch('database/database.sqlite');"
php artisan migrate --no-interaction
npm ci
npm run build
```

`.env`のコピーと鍵生成は初回だけです。
既存の設定や鍵を上書きしないでください。
各コマンドがエラーなく終了し、マイグレーションとビルドが完了したら起動へ進みます。

`composer install`と`npm ci`は、lockファイルに記録された依存ライブラリを取得します。
ネットワークへのアクセスが必要です。
npmのインストール時スクリプトは`.npmrc`で無効にしており、ビルドは`npm run build`で明示的に実行します。

## 起動して画面を開く

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

| サンプル | URLパス | 確認すること |
| --- | --- | --- |
| ツール一覧・共通メニュー | `/` | 各ツールへ移動できる |
| パスワードの使い方 | `/password-generator` | 生成画面への案内がある |
| パスワード生成・コピー | `/password-generator/generate` | 文字数と文字種を指定して生成し、コピーできる |
| 年間カレンダー | `/calendar?year=2026` | 12か月・祝日・六曜・記念日と年切替 |
| ルートの直接応答 | `/hello` | Hello World!と表示される |
| Bladeの画面表示 | `/hello/view` | BladeでHello World!を表示する |
| 名前入力フォーム | `/learning/greeting` | 入力名を含む挨拶と、入力エラーを表示する |

例えば名前入力フォームは`http://127.0.0.1:8000/learning/greeting`で開きます。
終了は起動したターミナルで`Ctrl + C`です。

パスワードは8〜64文字で、選んだ文字種をそれぞれ最低1文字含めます。
生成結果のDB・ログ・Web Storageへの保存機能はなく、コピーは利用者の操作で行います。
連続した生成要求には毎分30回/IPの制限があります。

挨拶フォームの名前は必須・文字列・40文字以内です。
名前をDBへ保存する処理はありませんが、エラー時の再表示にセッションを使います。
ブラウザーの入力制限とLaravel側の入力検証を確認できます。

## テスト

アプリ内で次を実行します。

```bash
composer validate --strict
composer check-platform-reqs
php artisan test --compact
```

PHPUnitのテストではメモリ内SQLiteを使います。
ローカルのアプリ用DBとは別に実行します。
PHPやOSのバージョンによる結果は、各自の環境で確認してください。

### ブラウザーテスト（任意）

初回はPlaywright用Chromiumと、必要に応じてOSの共有ライブラリを用意します。
ダウンロードやOSへの変更を伴うため、実行内容を確認してから行ってください。

```bash
npm run browser:install
# OSライブラリ不足が報告された場合のみ実行
npm run browser:install-deps
npm run test:browser:check
```

アプリを起動したまま、別ターミナルの同じアプリフォルダーで実行します。

```bash
npm run test:browser
```

確認結果と画像は`test-results/browser/`へ出力され、Git管理から除外されます。
`test:browser:learning`で基礎サンプル、`test:browser:tools`でツール画面だけを確認することもできます。
違うポートで起動する場合は、`TEST_BASE_URL`へそのURLを指定します。

Chromiumが起動しない場合は、エラーに示された不足ライブラリと`npm run test:browser:check`の結果を確認してください。

## 主なファイル

| ファイル・フォルダー | 役割 |
| --- | --- |
| `routes/web.php` | 画面表示とPOSTのルート |
| `app/Http/Controllers/` | 入力の受け取り・画面への受け渡し |
| `app/Http/Requests/` | パスワード生成の入力検証 |
| `app/Services/` | パスワードの生成処理 |
| `resources/views/` | Bladeテンプレートと共通レイアウト |
| `tests/Feature/`・`tests/Unit/` | HTTP応答と生成処理のテスト |
| `tests/Browser/` | ブラウザーでの操作テスト |

ソース・テスト・lockファイルと、値を空にした`.env.example`を含みます。
実際の`.env`、DB、ログ、依存ライブラリ、ビルド済みファイルは含めません。

## ライセンス

サンプルはリポジトリルートの[MIT License](../../LICENSE)に従います。
依存ライブラリは各ライブラリのライセンスに従います。

## 年間カレンダー

1900〜2100年を表示します。日曜始まり、PCは横3か月・縦4段、600px以下は1か月ずつ縦に12か月。今日の日付は日本時間で表示し、今年の該当日には「今日」と枠を付けます。

祝日CSVは1955〜2027年。六曜の元データは1931-02-17〜2100-02-08。収録範囲外は未収録と明示します。改元年は2つの元号、未来年は現行元号での換算と表示。犬の日は1987年以降の11月1日です。

[データの出典・ライセンスと更新方法](resources/calendar/README.md)を確認してください。祝日テキストの更新コマンドは取得済みCSVをローカル変換するもので、自動通信しません。六曜は参考表示で、全日を独立した暦と照合したものではありません。

```bash
php artisan test --compact --filter=Calendar
npm run test:browser:calendar
```

カレンダーの年切替と記念日の展開はJavaScriptなしで動作します。予定の登録・保存機能はありません。
