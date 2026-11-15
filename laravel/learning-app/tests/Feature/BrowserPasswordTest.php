<?php

namespace Tests\Feature;

use App\Services\PasswordGenerator;
use Tests\TestCase;

/** ブラウザー生成がサーバー生成を呼ばず、広告と機密応答の方針を維持することを確認する。 */
class BrowserPasswordTest extends TestCase
{
    /**
     * フォーム送信を持たず、広告なし時の通信制限と保存抑止が付くことを確認する。
     *
     * @return void HTML・ヘッダーとサービス未呼出しをアサートする。
     */
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

    /**
     * 広告有効時のCSPと、不正広告設定時の厳しいCSPへの切替を確認する。
     *
     * @return void 両設定のヘッダーと広告表示をアサートする。
     */
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

    /**
     * 既存URLを維持し、メニューから両方の生成画面へ進めることを確認する。
     *
     * @return void リダイレクトとリンクをアサートする。
     */
    public function test_original_password_routes_remain_and_menu_links_to_both_tools(): void
    {
        $this->get(route('password.guide'))->assertRedirect(route('password.form'));
        $this->get(route('password.form'))->assertOk()->assertSee(route('password.generate'));
        $this->get(route('tools.index'))->assertOk()->assertSee(route('password.form'))->assertSee(route('password.browser'));
    }
}
