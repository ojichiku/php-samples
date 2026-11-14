<?php

namespace Tests\Feature;

use Tests\TestCase;

class UnitConverterTest extends TestCase
{
    public function test_converter_is_an_independent_get_only_tool_with_navigation(): void
    {
        $this->get('/unit-converter')->assertOk()->assertSee('単位換算ツール')
            ->assertSee('変換元の数値')->assertSee('変換後の数値')
            ->assertSee('id="converted" type="text" readonly', false)
            ->assertSee('id="unit-inputs" disabled', false)
            ->assertSee('JavaScriptが必要')->assertSee('id="reference"', false);
        $this->get('/')->assertOk()->assertSee(route('unit.converter'))->assertSee('6つのツール');
        $this->get('/calendar')->assertOk()->assertSee(route('unit.converter'));
        $this->post('/unit-converter', ['value' => '12.34'])->assertStatus(405);
    }

    public function test_two_advertisements_are_outside_the_converter_and_do_not_enable_analytics(): void
    {
        config(['advertising.enabled' => true, 'advertising.client' => 'ca-pub-0000000000000000',
            'advertising.slot' => '1234567890', 'analytics.enabled' => true, 'analytics.measurement_id' => 'G-TEST123456']);
        $this->app->instance('env', 'production');
        $html = $this->get('/unit-converter')->assertOk()->assertDontSee('data-text-analytics')
            ->assertDontSee('googletagmanager.com')->getContent();
        $this->assertSame(2, substr_count($html, 'data-ad-slot='));
        $this->assertSame(1, substr_count($html, 'pagead2.googlesyndication.com'));
        $this->assertLessThan(strpos($html, 'id="unit-converter"'), strpos($html, 'data-ad-slot='));
        $this->assertGreaterThan(strpos($html, 'id="reference"'), strrpos($html, 'data-ad-slot='));
        $this->app->instance('env', 'local');
        config(['advertising.preview' => true]);
        $this->get('/unit-converter')->assertSee('ad-preview')->assertDontSee('adsbygoogle');
    }
}
