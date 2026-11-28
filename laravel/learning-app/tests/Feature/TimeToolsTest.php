<?php

namespace Tests\Feature;

use Tests\TestCase;

/** 時間ツールの独立GET入口、初期入力無効化、共通導線と操作領域外の広告を検証する。 */
class TimeToolsTest extends TestCase
{
    /**
     * 計測値はPOSTせず、JavaScriptの初期化完了まで操作を無効にする。
     *
     * @return void 画面と共通メニュー、HTTPメソッドの期待値を確認する。
     */
    public function test_time_tools_is_a_get_only_page_with_four_tabs_and_navigation(): void
    {
        $this->get('/time-tools')->assertOk()->assertSee('時間ツール')
            ->assertSee('世界時計')->assertSee('ストップウォッチ')
            ->assertSee('タイマー')->assertSee('日時の差を計算')
            ->assertSee('id="time-inputs" disabled', false)
            ->assertSee('JavaScriptが必要')->assertSee('東京の日時で計算');
        $this->get('/')->assertOk()->assertSee(route('time.tools'))->assertSee('17個のツール');
        $this->get('/calendar')->assertOk()->assertSee(route('time.tools'));
        $this->post('/time-tools', ['seconds' => '10'])->assertStatus(405);
    }

    /**
     * 合意済みの操作領域後の1枠だけを表示し、テキスト専用解析は読み込まない。
     *
     * @return void 本番広告とローカル仮枠の位置および解析除外を確認する。
     */
    public function test_advertisements_surround_the_tool_without_analytics(): void
    {
        config(['advertising.enabled' => true, 'advertising.client' => 'ca-pub-0000000000000000',
            'advertising.slot' => '1234567890', 'analytics.enabled' => true, 'analytics.measurement_id' => 'G-TEST123456']);
        $this->app->instance('env', 'production');
        $html = $this->get('/time-tools')->assertOk()->assertDontSee('data-text-analytics')
            ->assertDontSee('googletagmanager.com')->getContent();
        $this->assertSame(2, substr_count($html, 'data-ad-slot='));
        $this->assertLessThan(strpos($html, 'id="time-tools"'), strpos($html, 'data-ad-slot='));
        $this->assertGreaterThan(strpos($html, 'id="difference-result"'), strrpos($html, 'data-ad-slot='));
        $this->app->instance('env', 'local');
        config(['advertising.preview' => true]);
        $this->get('/time-tools')->assertSee('ad-preview')->assertDontSee('adsbygoogle');
    }
}
