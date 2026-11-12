<?php

namespace Tests\Feature;

use Tests\TestCase;

class AdvertisingTest extends TestCase
{
    private function enableAds(string $environment): void
    {
        $this->app->instance('env', $environment);
        config(['advertising.enabled' => true, 'advertising.preview' => true,
            'advertising.client' => 'ca-pub-0000000000000000', 'advertising.slot' => '1234567890']);
    }

    public function test_live_ads_appear_on_allowed_pages_and_password_post_results(): void
    {
        $this->enableAds('production');
        foreach (['/', '/calendar', '/password-generator/generate', '/password-generator-browser', '/date-tools'] as $path) {
            $html = $this->get($path)->assertOk()->assertSee('data-ad-slot="1234567890"', false)->getContent();
            $this->assertSame(1, substr_count($html, 'pagead2.googlesyndication.com'));
            $this->assertSame(in_array($path, ['/', '/password-generator/generate', '/password-generator-browser', '/date-tools'], true) ? 2 : 1, substr_count($html, 'data-ad-slot='));
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

    public function test_development_preview_never_loads_live_ads(): void
    {
        $this->enableAds('local');
        $this->get('/')->assertOk()->assertSee('広告の配置確認用スペース')->assertDontSee('adsbygoogle');
        $this->get('/password-generator-browser')->assertOk()->assertSee('ad-preview')->assertDontSee('adsbygoogle');
        $this->get('/password-generator/generate')->assertOk()->assertSee('ad-preview')->assertDontSee('adsbygoogle');
    }

    public function test_disabled_or_invalid_configuration_does_not_load_ads(): void
    {
        $this->enableAds('production');
        config(['advertising.enabled' => false]);
        $this->get('/')->assertDontSee('adsbygoogle')->assertDontSee('ad-preview');
        config(['advertising.enabled' => true, 'advertising.client' => 'invalid']);
        $this->get('/')->assertDontSee('adsbygoogle');
    }

    public function test_old_guides_redirect_to_the_single_page_tools(): void
    {
        $this->get('/password-generator')->assertRedirect(route('password.form'));
        $this->get('/password-generator-browser/guide')->assertRedirect(route('password.browser'));
        $this->get('/')->assertSee(route('password.form'))->assertSee(route('password.browser'));
    }
}
