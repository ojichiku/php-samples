<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** ブラウザー生成画面に、広告の有無に応じたCSPを付けるミドルウェア。 */
class BrowserPasswordPolicy
{
    /**
     * 後続の応答へCSPを設定する。本番広告が有効な場合は第三者リソースを許す。
     *
     * @param  Request  $request  ブラウザー生成画面へのHTTPリクエスト。
     * @param  Closure(Request): Response  $next  後続のリクエスト処理。
     * @return Response CSPヘッダーを追加した応答。
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $advertisingEnabled = app()->environment('production') && config('advertising.enabled')
            && preg_match('/\Aca-pub-[0-9]{16}\z/', (string) config('advertising.client'))
            && preg_match('/\A[0-9]+\z/', (string) config('advertising.slot'));

        if ($advertisingEnabled) {
            // 広告はスクリプト/フレーム/通信を使うため、この場合にページ全体の通信隔離を主張しない。
            $response->headers->set('Content-Security-Policy', "form-action 'none'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'");

            return $response;
        }

        $response->headers->set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'");

        return $response;
    }
}
