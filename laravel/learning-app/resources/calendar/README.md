# カレンダーのデータと更新

カレンダーの日付表示は1900〜2100年。外部APIを表示時に呼ばず、同梱したテキストを読みます。DBへの保存処理はありません。

## 祝日・休日

`holidays.csv`はUTF-8（date,name）。内閣府の[国民の祝日](https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html)のCSVを日付形式・文字コードだけ変換しています。1955〜2027年、1067件。取得確認日は2026-11-03。出典・範囲・元ファイルのSHA-256は`holidays-meta.json`に保持します。現在の法則から過去・未来の祝日を補いません。

更新は開発環境で行います。公式CSVを取得後、アプリのフォルダーで次を実行します（コマンド自身は通信しません）。

```bash
php artisan calendar:import-holidays /path/to/syukujitsu.csv --checked-on=YYYY-MM-DD
php artisan test --compact --filter=Calendar
```

確認日には実際の確認日を入れます。元データのヘッダー・日付・重複・収録年の縮小・年の欠落等を検証してから変換します。新旧差分と公式ページの年間一覧を確認し、CSVとメタ情報を一組でレビュー・テスト・配置してください。取り込み後の差分確認は必須であり、この検証だけで公表元の完全性を保証しません。Web管理画面や定期的な自動取得は設けていません。

## 六曜

`kyureki.json`は[zizicici/kyureki-json](https://github.com/zizicici/kyureki-json)のコミット`04593115cd021e09d37116fab97e0a322a85b839`のデータを変更せず同梱。MITライセンス原文は`kyureki-LICENSE.txt`。1931-02-17〜2100-02-08の日付を収録。旧暦の月日を合計し6で割った余り（0:大安、1:赤口、2:先勝、3:友引、4:先負、5:仏滅）から表示します。閏月は前の月と同じ月番号を使います。

[国立国会図書館の六曜解説](https://www.ndl.go.jp/koyomi/chapter3/s3.html)に示された旧暦各月1日の順序と照合しています。月の連続性、旧暦月初と閏月境界を確認。全日について独立した暦と照合したものではありません。2033年前後は[国立天文台の説明](https://www.nao.ac.jp/news/blog/2023/20230829-koyomi.html)にあるように旧暦の定め方に曖昧さがあり、参考表示とします。データ範囲外を単純な6日周期で推測しません。

## 記念日

`anniversaries.csv`はUTF-8（month_day,name,start_year,source）。日付・名称・適用開始年・出典を編集できます。同じ月日に複数行も可。現在は[埼玉県の犬の日案内](https://www.pref.saitama.lg.jp/b0716/doubutu-inunohi1.html)を根拠に11月1日「犬の日」（1987年以降）を収録。祝日と区別します。追加時は出典と開始年を確認してください。
