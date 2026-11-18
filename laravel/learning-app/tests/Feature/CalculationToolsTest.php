<?php

namespace Tests\Feature;

use Tests\TestCase;

/** 日常計算のGET入口とJavaScript無効時、広告の位置を検証する。 */
class CalculationToolsTest extends TestCase
{
    /**
     * 入力をPOSTで受け取らず、初期操作を無効にした画面を返す。
     *
     * @return void GET画面の4用途・初期状態とPOST拒否を確認する。
     */
    public function test_get_only_screen_keeps_initial_inputs_disabled(): void
    {
        $this->get('/calculation-tools')->assertOk()->assertSee('日常計算ツール')
            ->assertSee('割合')->assertSee('割引')->assertSee('増減率')->assertSee('割り勘')
            ->assertSee('<fieldset disabled>', false)->assertSee('JavaScriptを有効に')
            ->assertDontSee('UI確認用')->assertDontSee('googletagmanager.com');
        $this->post('/calculation-tools', ['total' => '1000'])->assertStatus(405);
    }

    /**
     * 上下2枠に限定し、計算入力と結果の間へ広告を置かない。
     *
     * @return void 本番設定でのローダー1回・広告2枠と位置を確認する。
     */
    public function test_two_ads_surround_the_calculation_area(): void
    {
        config(['advertising.enabled' => true, 'advertising.client' => 'ca-pub-0000000000000000',
            'advertising.slot' => '1234567890']);
        $this->app->instance('env', 'production');
        $html = $this->get('/calculation-tools')->assertOk()->getContent();
        $this->assertSame(2, substr_count($html, 'data-ad-slot='));
        $this->assertSame(1, substr_count($html, 'pagead/js/adsbygoogle.js'));
        $this->assertLessThan(strpos($html, 'id="ratio-form"'), strpos($html, 'data-ad-slot='));
        $this->assertGreaterThan(strpos($html, 'id="split-result"'), strrpos($html, 'data-ad-slot='));
    }
}
