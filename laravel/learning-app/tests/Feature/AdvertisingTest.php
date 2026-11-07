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

    public function test_live_ads_only_appear_on_public_content_pages(): void
    {
        $this->enableAds('production');
        foreach (['/', '/calendar', '/password-generator', '/password-generator-browser/guide', '/password-generator-browser'] as $path) {
            $html = $this->get($path)->assertOk()->assertSee('data-ad-slot="1234567890"', false)->getContent();
            $this->assertSame(1, substr_count($html, 'pagead2.googlesyndication.com'));
            $this->assertSame(in_array($path, ['/', '/password-generator-browser'], true) ? 2 : 1, substr_count($html, 'data-ad-slot='));
        }
        foreach (['/password-generator/generate', '/hello/view', '/missing-page'] as $path) {
            $this->get($path)->assertDontSee('adsbygoogle')->assertDontSee('ad-preview');
        }
        $this->app->instance('env', 'testing');
        $this->post('/password-generator/generate', ['length' => 16, 'groups' => ['lowercase', 'numbers']])
            ->assertOk()->assertDontSee('adsbygoogle');
    }

    public function test_development_preview_never_loads_live_ads(): void
    {
        $this->enableAds('local');
        $this->get('/')->assertOk()->assertSee('広告の配置確認用スペース')->assertDontSee('adsbygoogle');
        $this->get('/password-generator-browser')->assertOk()->assertSee('ad-preview')->assertDontSee('adsbygoogle');
    }

    public function test_disabled_or_invalid_configuration_does_not_load_ads(): void
    {
        $this->enableAds('production');
        config(['advertising.enabled' => false]);
        $this->get('/')->assertDontSee('adsbygoogle')->assertDontSee('ad-preview');
        config(['advertising.enabled' => true, 'advertising.client' => 'invalid']);
        $this->get('/')->assertDontSee('adsbygoogle');
    }

    public function test_browser_guide_links_to_unchanged_generator_url(): void
    {
        $this->get('/password-generator-browser/guide')->assertOk()
            ->assertSee(route('password.browser'))->assertSee('第三者スクリプト');
        $this->get('/')->assertSee(route('password.browser.guide'));
    }
}
