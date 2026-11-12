<?php

namespace Tests\Feature;

use App\Services\PasswordGenerator;
use Tests\TestCase;

class BrowserPasswordTest extends TestCase
{
    public function test_browser_generator_has_one_page_and_never_calls_server_generator(): void
    {
        $this->mock(PasswordGenerator::class)->shouldNotReceive('generate');
        $response = $this->get(route('password.browser'));
        $response->assertOk()->assertSee('パスワード生成（JavaScript版）')
            ->assertSee('発行数')->assertSee('利用できる記号を直接入力')
            ->assertDontSee('<form', false)
            ->assertDontSee('name="password"', false)
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
            ->assertHeader('Referrer-Policy', 'no-referrer');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString("connect-src 'none'", $response->headers->get('Content-Security-Policy'));
    }

    public function test_advertising_allows_external_resources_without_changing_sensitive_headers(): void
    {
        $this->app->instance('env', 'production');
        config(['advertising.enabled' => true, 'advertising.client' => 'ca-pub-0000000000000000', 'advertising.slot' => '1234567890']);
        $response = $this->get(route('password.browser'))->assertOk()
            ->assertSee('同じページで第三者スクリプト')->assertSee('adsbygoogle')
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertStringNotContainsString("connect-src 'none'", $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString("form-action 'none'", $response->headers->get('Content-Security-Policy'));
        config(['advertising.client' => 'invalid']);
        $response = $this->get(route('password.browser'))->assertDontSee('adsbygoogle');
        $this->assertStringContainsString("connect-src 'none'", $response->headers->get('Content-Security-Policy'));
    }

    public function test_original_password_routes_remain_and_menu_links_to_both_tools(): void
    {
        $this->get(route('password.guide'))->assertRedirect(route('password.form'));
        $this->get(route('password.form'))->assertOk()->assertSee(route('password.generate'));
        $this->get(route('tools.index'))->assertOk()->assertSee(route('password.form'))->assertSee(route('password.browser'));
    }
}
