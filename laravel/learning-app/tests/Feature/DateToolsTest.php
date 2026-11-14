<?php

namespace Tests\Feature;

use Tests\TestCase;

class DateToolsTest extends TestCase
{
    public function test_independent_tool_is_available_from_navigation_and_index(): void
    {
        $this->get('/date-tools')->assertOk()->assertSee('日付・元号ツール')
            ->assertSee('西暦から元号')->assertSee('元号から西暦')->assertSee('元号対応表')
            ->assertSee('日付計算')->assertSee('年齢')->assertSee('1873年1月1日')
            ->assertSee('data-date-inputs disabled', false)->assertSee('JavaScriptが必要');
        $this->get('/')->assertOk()->assertSee(route('date.tools'))->assertSee('6つのツール');
        $this->get('/calendar')->assertOk()->assertSee(route('date.tools'));
        $this->post('/date-tools', ['birthday' => '2000-02-29'])->assertStatus(405);
    }

    public function test_two_advertisements_do_not_enable_analytics(): void
    {
        config(['advertising.enabled' => true, 'advertising.client' => 'ca-pub-0000000000000000',
            'advertising.slot' => '1234567890', 'analytics.enabled' => true, 'analytics.measurement_id' => 'G-TEST123456']);
        $this->app->instance('env', 'production');
        $html = $this->get('/date-tools')->assertOk()
            ->assertDontSee('data-text-analytics')->assertDontSee('googletagmanager.com')->getContent();
        $this->assertSame(2, substr_count($html, 'data-ad-slot='));
        $this->assertSame(1, substr_count($html, 'pagead2.googlesyndication.com'));
        $this->app->instance('env', 'local');
        config(['advertising.preview' => true]);
        $this->get('/date-tools')->assertSee('ad-preview')->assertDontSee('adsbygoogle');
    }
}
