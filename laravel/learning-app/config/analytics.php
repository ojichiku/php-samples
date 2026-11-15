<?php

/** テキスト画面の解析設定。本番/Route/測定IDの書式を表示側でも確認する。 */

return [
    // 解析読込みを許すか。
    'enabled' => env('ANALYTICS_ENABLED', false),
    // GA測定ID。入力内容ではなく設定値をマーカーへ渡す。
    'measurement_id' => env('ANALYTICS_MEASUREMENT_ID', ''),
];
