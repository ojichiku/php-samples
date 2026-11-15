<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** 生成値を含む可能性のある応答へ、キャッシュ/参照元/検索登録の制御ヘッダーを付ける。 */
class PreventSensitiveResponseCaching
{
    /**
     * 後続の応答を受け取り共通ヘッダーを追加する。
     *
     * @param  Request  $request  対象のHTTPリクエスト。
     * @param  Closure(Request): Response  $next  後続のリクエスト処理。
     * @return Response 保存抑止などのヘッダーを追加した応答。
     */
    public function handle(Request $request, Closure $next): Response
    {
        return self::applyHeaders($next($request));
    }

    /**
     * 通常応答や例外応答へ同じヘッダーを適用する。
     *
     * @param  Response  $response  ヘッダーを付ける応答。同じインスタンスを更新する。
     * @return Response no-store/private、no-referrer、noindex/nofollowを付けた応答。
     */
    public static function applyHeaders(Response $response): Response
    {
        $response->headers->set('Cache-Control', 'no-store, private');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow');

        return $response;
    }
}
