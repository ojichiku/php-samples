<?php

namespace Tests\Feature;

use Tests\TestCase;

class TextToolsTest extends TestCase
{
    public function test_tools_are_independent_and_navigation_is_available(): void
    {
        $response = $this->get('/text-tools')->assertOk();
        foreach (['count', 'format', 'replace', 'lines', 'convert', 'match', 'generate'] as $tool) {
            $response->assertSee('data-tool="'.$tool.'"', false);
        }
        $response->assertSee('機密情報は入力しないでください')->assertSee('サンプル生成');
        $this->get('/')->assertSee(route('text.tools'))->assertSee('4つのツール');
        $this->post('/text-tools', ['text' => 'private'])->assertStatus(405);
    }

    public function test_advertising_and_analytics_are_production_only_and_do_not_change_password_policy(): void
    {
        config(['advertising.enabled' => true, 'advertising.client' => 'ca-pub-0000000000000000',
            'advertising.slot' => '1234567890', 'analytics.enabled' => true, 'analytics.measurement_id' => 'G-TEST123456']);
        $this->app->instance('env', 'production');
        $html = $this->get('/text-tools')->assertOk()->assertSee('data-text-analytics="G-TEST123456"', false)->getContent();
        $this->assertSame(2, substr_count($html, 'data-ad-slot='));
        $this->assertSame(1, substr_count($html, 'pagead2.googlesyndication.com'));
        $this->get('/password-generator-browser')->assertDontSee('data-text-analytics')->assertSee('adsbygoogle')
            ->assertHeader('Content-Security-Policy');
        $this->get('/calendar')->assertDontSee('data-text-analytics');
        $this->app->instance('env', 'local');
        $this->get('/text-tools')->assertDontSee('data-text-analytics')->assertDontSee('adsbygoogle');
    }

    public function test_invalid_analytics_identifier_is_not_rendered(): void
    {
        $this->app->instance('env', 'production');
        config(['analytics.enabled' => true, 'analytics.measurement_id' => '"><script>']);
        $this->get('/text-tools')->assertOk()->assertDontSee('data-text-analytics');
    }
}
