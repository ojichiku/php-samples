<?php

namespace Tests\Feature;

use Tests\TestCase;

/** 一般電卓の公開入口、初期画面と広告を確認する。 */
class GeneralCalculatorTest extends TestCase
{
    /**
     * 画面はGETで返し、式を受け付けるPOSTを提供しない。
     *
     * @return void 応答と初期表示を検証する。
     */
    public function test_the_calculator_loads_empty_and_only_accepts_get(): void
    {
        $url = route('general.calculator');
        $this->get($url)->assertOk()
            ->assertSee('id="calculator" inert', false)
            ->assertSee('angle-indicator', false)->assertSee('度 DEG')
            ->assertSee('JavaScriptを有効に')
            ->assertSeeInOrder(['href="'.$url.'"', 'aria-current="page"', '一般電卓</a>'], false);
        $this->post($url, ['expression' => '2+3'])->assertMethodNotAllowed();
    }

    /**
     * 共通メニューと一覧カードの双方に入口を表示する。
     *
     * @return void リンクの順、名称、公開件数を検証する。
     */
    public function test_the_calculator_is_linked_from_the_menu_and_catalog(): void
    {
        $href = 'href="'.route('general.calculator').'"';
        $this->get(route('calendar'))->assertOk()
            ->assertSeeInOrder(['<nav aria-label="共通メニュー">', '日常計算</a>', $href, '一般電卓</a>', '</nav>'], false);
        $this->get(route('tools.index'))->assertOk()->assertSee('13個のツール')
            ->assertSeeInOrder(['<h3>一般電卓</h3>', $href, '一般電卓を開く', '<h3>所有者用メニュー</h3>'], false);
    }

    /**
     * 計算欄の上下だけに広告枠を置く。
     *
     * @return void 広告仮枠と画面要素の順を検証する。
     */
    public function test_ad_previews_surround_the_calculator(): void
    {
        config(['advertising.preview' => true]);
        $response = $this->get(route('general.calculator'))->assertOk();
        $response->assertSeeInOrder(['<h1 class="tool-title">一般電卓', 'class="ad-preview"', 'id="expression"', 'id="history"', 'class="ad-preview"'], false);
        $this->assertSame(2, substr_count($response->getContent(), 'class="ad-preview"'));
    }
}
