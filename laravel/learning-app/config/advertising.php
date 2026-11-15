<?php

/** 広告コンポーネントとCSPが参照する設定。環境変数から読むだけで、このファイル自体は通信しない。 */

return [
    // 本番広告の有効化。表示側でRoute/ID書式/本番環境も確認する。
    'enabled' => env('ADSENSE_ENABLED', false),
    // 本番以外で配置確認用の仮枠を出す。
    'preview' => env('ADSENSE_PREVIEW', false),
    // 広告クライアントID。実値は環境変数で与える。
    'client' => env('ADSENSE_CLIENT', ''),
    // 広告枠ID。実値は環境変数で与える。
    'slot' => env('ADSENSE_SLOT', ''),
];
