<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BrowserPasswordPolicy
{
    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $advertisingEnabled = app()->environment('production') && config('advertising.enabled')
            && preg_match('/\Aca-pub-[0-9]{16}\z/', (string) config('advertising.client'))
            && preg_match('/\A[0-9]+\z/', (string) config('advertising.slot'));

        if ($advertisingEnabled) {
            // AdSense loads scripts, frames and network resources. Do not claim network isolation here.
            $response->headers->set('Content-Security-Policy', "form-action 'none'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'");

            return $response;
        }

        $response->headers->set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'");

        return $response;
    }
}
