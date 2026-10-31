<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        RateLimiter::for('password-generation', function (Request $request): Limit {
            return Limit::perMinute(30)->by($request->ip())->response(function (Request $request, array $headers): Response {
                return response('生成の回数が多くなっています。しばらく待ってからやり直してください。', 429, $headers);
            });
        });
    }
}
