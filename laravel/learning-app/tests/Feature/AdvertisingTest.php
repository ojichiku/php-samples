<?php

namespace Tests\Feature;

use Tests\TestCase;

/** 広告対象Routeと環境/ID設定を変えた表示条件を検証する。 */
class AdvertisingTest extends TestCase
{
    /**
     * テスト用IDで広告/仮枠の両スイッチを有効にする。
     *
     * @param  string  $environment  テスト内の環境名（production/local）。
     * @return void テスト用アプリ設定を更新する。外部通信はしない。
     */
    private function enableAds(string $environment): void
    {
        $this->app->instance('env', $environment);
        config(['advertising.enabled' => true, 'advertising.preview' => true,
            'advertising.client' => 'ca-pub-0000000000000000', 'advertising.slot' => '1234567890']);
    }

    /**
     * 許可したページ/生成POST結果に広告を出し、ローダーは1回だけ読み込む。
     *
     * @return void 応答/表示の期待値をアサートする。
     */
    public function test_live_ads_appear_on_allowed_pages_and_password_post_results(): void
    {
        $this->enableAds('production');
        $expectedSlots = [
            '/' => 2,
            '/calendar' => 1,
            '/password-generator/generate' => 2,
            '/password-generator-browser' => 2,
            '/date-tools' => 2,
            '/unit-converter' => 2,
            '/time-tools' => 2,
            '/calculation-tools' => 2,
            '/general-calculator' => 2,
            '/tabular-data-converter' => 2,
            '/excel-to-csv' => 2,
            '/json-tools' => 2,
            '/yaml-tools' => 2,
            '/url-encoding' => 2,
            '/radix-converter' => 2,
            '/character-encoding' => 2,
            '/color-code' => 2,
            '/text-tools' => 2,
        ];
        foreach ($expectedSlots as $path => $count) {
            $html = $this->get($path)->assertOk()->assertSee('data-ad-slot="1234567890"', false)->getContent();
            $this->assertSame(1, substr_count($html, 'pagead2.googlesyndication.com'));
            $this->assertSame($count, substr_count($html, 'data-ad-slot='), $path);
        }
        foreach (['/hello/view', '/missing-page'] as $path) {
            $this->get($path)->assertDontSee('adsbygoogle')->assertDontSee('ad-preview');
        }
        $response = $this->withSession(['_token' => 'advertising-test-token'])->post('/password-generator/generate', ['_token' => 'advertising-test-token', 'length' => 16, 'groups' => ['lowercase', 'numbers']])
            ->assertOk()->assertSee('adsbygoogle')->assertSee('第三者スクリプト')
            ->assertHeader('Referrer-Policy', 'no-referrer')->assertHeader('X-Robots-Tag', 'noindex, nofollow');
        $this->assertSame(2, substr_count($response->getContent(), 'data-ad-slot='));
        $this->assertSame(1, substr_count($response->getContent(), 'pagead2.googlesyndication.com'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    /**
     * ローカルでは仮枠だけを表示し、実広告を読み込まない。
     *
     * @return void 応答/表示の期待値をアサートする。
     */
    public function test_development_preview_never_loads_live_ads(): void
    {
        $this->enableAds('local');
        $this->get('/')->assertOk()->assertSee('広告の配置確認用スペース')->assertDontSee('adsbygoogle');
        $this->get('/password-generator-browser')->assertOk()->assertSee('ad-preview')->assertDontSee('adsbygoogle');
        $this->get('/password-generator/generate')->assertOk()->assertSee('ad-preview')->assertDontSee('adsbygoogle');
    }

    /**
     * 無効設定/不正IDでは本番でも実広告を出さない。
     *
     * @return void 応答/表示の期待値をアサートする。
     */
    public function test_disabled_or_invalid_configuration_does_not_load_ads(): void
    {
        $this->enableAds('production');
        config(['advertising.enabled' => false]);
        $this->get('/')->assertDontSee('adsbygoogle')->assertDontSee('ad-preview');
        config(['advertising.enabled' => true, 'advertising.client' => 'invalid']);
        $this->get('/')->assertDontSee('adsbygoogle');
    }

    /**
     * 旧説明URLが現在の1画面構成へ転送される。
     *
     * @return void 応答/表示の期待値をアサートする。
     */
    public function test_old_guides_redirect_to_the_single_page_tools(): void
    {
        $this->get('/password-generator')->assertRedirect(route('password.form'));
        $this->get('/password-generator-browser/guide')->assertRedirect(route('password.browser'));
        $this->get('/')->assertSee(route('password.form'))->assertSee(route('password.browser'));
    }
}
