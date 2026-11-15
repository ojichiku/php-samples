<?php

/** 外部サービスの連携設定を環境変数から読む。設定ファイルを読むだけでは通信しない。 */

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    // メール連携のAPIキー。
    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    // メール連携のAPIキー。
    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    // AWSのメール連携用キー/秘密値/リージョン。
    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // 通知用のトークンと送信先。実値はコードへ書かない。
    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
