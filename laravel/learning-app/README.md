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
| 年間カレンダー | `/calendar?year=2026` | 12か月・祝日・六曜と年切替・今日への移動 |
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

1900〜2100年を表示します。日曜始まり、PCは横3か月・縦4段、1000px以下は1か月ずつ縦に12か月。今日の日付は日本時間で表示し、今年の該当日には「今日」と枠を付けます。「今日」ボタンで今年に戻り当日まで移動します。カレンダーの最大横幅は1600px、日付は1.35rem、六曜・祝日は0.875remです。

祝日CSVは1955〜2027年。六曜の元データは1931-02-17〜2100-02-08。収録範囲外は未収録と明示します。改元年は2つの元号、未来年は現行元号での換算と表示。

[データの出典・ライセンスと更新方法](resources/calendar/README.md)を確認してください。祝日テキストの更新コマンドは取得済みCSVをローカル変換するもので、自動通信しません。六曜は参考表示で、全日を独立した暦と照合したものではありません。

```bash
php artisan test --compact --filter=Calendar
npm run test:browser:calendar
```

カレンダーの年切替はJavaScriptなしで動作します。予定の登録・保存機能はありません。

## ブラウザーでパスワード生成（既存を残して追加）

`/password-generator-browser`。8〜128文字・1〜100件、初期値16文字・1件。英小/大/数字/記号を選択し、選んだ文字種を最低1文字含めます。記号は半角ASCII記号32種すべて、基本10種、ハイフン/アンダースコア、直接入力から選択。直接入力はASCII記号だけを許可し重複を除きます。

外部ライブラリを追加せず、自作JS＋crypto.getRandomValuesでブラウザー内生成。uint32範囲の不完全な末尾を棄却して文字を抽選し、必須文字種を含まない候補を再生成します。生成・コピー時にリクエストを送りません。DB/ログ/Web Storageへ保存するコードなし。結果は改行区切りで1つのテキストエリアに全件表示し、折り返しと高さ自動調整で全文を表示します。全件コピーまたは必要な行の手動選択でコピーします。条件変更とpagehide/pageshowで結果を消しますが、メモリーからの完全消去を保証するものではありません。クリップボードは利用者のコピー操作で変更し、消去しません。

乱数APIなしでは生成ボタンを無効化。コピー不可時は手動選択を案内。専用ルートはno-store/no-referrer/noindexで、CSPにconnect-src/form-actionのnoneを設定。既存の`/password-generator`とサーバー生成機能・テストは維持します。

```bash
npm run test:js
npm run test:browser:password-browser
```

ソースは`resources/js/browser-password-engine.js`（生成）、`browser-password.js`（画面操作）、`resources/views/tools/password-browser.blade.php`。ブラウザーテストは生成100件・記号制限・コピーと失敗時・非通信・Web Storageなし・乱数/JSなし・横幅4種を確認します。


## 任意の広告設定

初期状態では広告は無効です。実際の広告IDは含めていません。ツール一覧は説明後とカード一覧後の2枠、カレンダーと新旧パスワード説明は各1枠が対象です。パスワード生成画面では広告などの第三者スクリプトを読み込みません。ブラウザー版は`/password-generator-browser/guide`から使い方を確認でき、従来の生成URLも利用できます。

手動広告を使用する場合は、自分の管理画面の広告コードから`ADSENSE_CLIENT`と`ADSENSE_SLOT`を設定し、本番環境で`ADSENSE_ENABLED=true`にします。実広告は`APP_ENV=production`のときだけ読み込みます。自動広告の有効/無効と掲載ルールは自分のサイトに合わせて管理画面で確認してください。設定キャッシュを使用している環境では設定変更後に更新してください。

ローカルは`ADSENSE_PREVIEW=true php artisan serve --host=127.0.0.1 --port=8000`で通信しない仮枠を表示できます。このサーバーに対して`node tests/Browser/advertising-flow.cjs`を実行すると320/375/768/1280px幅で配置順、横はみ出し、印刷時の非表示、生成画面の除外を確認します。ローカルの仮枠は実広告の高さ・配信を再現するものではありません。

コードの設置は広告の配信や収益を保証しません。公開時には掲載内容、操作との干渉、ads.txt、プライバシー表示などを確認してください。


## テキスト便利ツール集

`/text-tools`に7つの独立したツール（文字数・整形・置換・行整理・文字変換・正規表現一致確認・サンプル生成）を追加。各ツールの入力と結果は共有しません。JavaScriptでブラウザー内処理し、アプリは入力や結果をAPI・DB・Web Storage・URLへ保存/送信しません。ページには広告・解析を導入できるため、通信なしや機密入力の安全性は保証しません。

正規表現はWorker内で実行し1秒で中止。置換・変換・一致確認はJavaScript構文とi/m/s/u、生成は限定ASCII構文とuのみです。生成後は同じ式で文字列全体への一致を検証します。後方参照・先読み/後読み・否定クラス・ドット・Unicodeプロパティなどの生成は未対応で、要求数に達しない場合があります。入力10万・パターン/置換語1,000・結果100万コードポイント、一致表示1,000件、生成1〜10件/1件256文字の上限があります。

`npm run test:js`と`php artisan test --compact --filter=TextTools`、起動後に`npm run test:browser:text-tools`で確認できます。広告は既存設定を再利用し、解析は本番の`ANALYTICS_ENABLED=true`と`ANALYTICS_MEASUREMENT_ID`で有効化。解析イベントは固定ツール名・成功/失敗分類のみで入力内容を含めません。公開サンプルに実IDは含めません。
