<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/** アプリ起動時に共通設定を登録する。サーバー生成の回数制限もここで定義する。 */
class AppServiceProvider extends ServiceProvider
{
    /**
     * サービスの結び付けを登録するフック。現在は追加登録なし。
     *
     * @return void 追加の登録処理は行わない。
     */
    public function register(): void
    {
        //
    }

    /**
     * サーバー生成をIPごとに1分30回へ制限する定義を登録する。
     *
     * @return void 回数制限の定義を登録する。
     */
    public function boot(): void
    {
        // リクエストのIPを制限キーにし、超過時は渡されたRetry-After等のヘッダーでHTTP429を返す。
        RateLimiter::for('password-generation', function (Request $request): Limit {
            return Limit::perMinute(30)->by($request->ip())->response(function (Request $request, array $headers): Response {
                return response('生成の回数が多くなっています。しばらく待ってからやり直してください。', 429, $headers);
            });
        });
    }
}
