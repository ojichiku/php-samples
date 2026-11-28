<?php

namespace Tests\Feature;

use Tests\TestCase;

/** 共通メニューとサーバー生成の初期画面を確認する。 */
class ToolNavigationTest extends TestCase
{
    /**
     * 利用可能な画面にリンクし、未実装の所有者ログインへリンクしない。
     *
     * @return void 応答/表示の期待値をアサートする。
     */
    public function test_menu_links_to_available_tools_and_keeps_owner_menu_unlinked(): void
    {
        $this->get(route('tools.index'))->assertOk()
            ->assertSee('サンプルツール集')
            ->assertSee(route('password.form'))
            ->assertSee(route('calendar'))
            ->assertDontSee('href="'.url('/login').'"', false);
    }

    /**
     * 生成画面に使い方と共通導線、サーバー生成/第三者コードの説明を表示する。
     *
     * @return void 応答/表示の期待値をアサートする。
     */
    public function test_generator_includes_instructions_and_common_menu(): void
    {
        $this->get(route('password.guide'))->assertRedirect(route('password.form'));
        $this->get(route('password.form'))->assertOk()
            ->assertSee('使い方と注意点')->assertSee(route('tools.index'))
            ->assertSee('サーバーで行い')->assertSee('第三者スクリプト');
    }

    /**
     * 初期文字数16と英数3種を設定し、生成値は空で機密応答ヘッダーを付ける。
     *
     * @return void 応答/表示の期待値をアサートする。
     */
    public function test_generator_starts_empty_with_documented_defaults(): void
    {
        $this->get(route('password.form'))->assertOk()
            ->assertViewHas('password', null)->assertViewHas('length', '16')
            ->assertViewHas('groups', ['lowercase', 'uppercase', 'numbers'])
            ->assertSee('コピーする')->assertSee(route('tools.index'))
            ->assertDontSee('adsbygoogle')->assertDontSee('fonts.bunny.net')
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    /**
     * 変換ツールのリンクと、ブラウザー内処理に使うGET専用入口を確認する。
     *
     * @return void 各画面のリンク、入力欄、HTTP応答をアサートする。
     */
    public function test_browser_converter_tools_expose_only_get_pages(): void
    {
        $this->get(route('tools.index'))->assertOk()
            ->assertSee(route('tabular.converter'))
            ->assertSee(route('excel.csv'))
            ->assertSee(route('json.tools'))
            ->assertSee(route('yaml.tools'))
            ->assertSee(route('url.encoding'))
            ->assertSee(route('radix.converter'))
            ->assertSee(route('character.encoding'))
            ->assertSee(route('color.code'));

        $inputs = [
            'tabular.converter' => 'input-file',
            'excel.csv' => 'excel-input',
            'json.tools' => 'json-file',
            'yaml.tools' => 'yaml-file',
            'url.encoding' => 'url-input',
            'radix.converter' => 'radix-integer',
            'character.encoding' => 'encoding-file',
            'color.code' => 'color-input',
        ];
        foreach ($inputs as $name => $inputId) {
            $url = route($name);
            $this->get($url)->assertOk()
                ->assertSee('aria-current="page"', false)
                ->assertSee('id="'.$inputId.'"', false);
            $this->post($url)->assertMethodNotAllowed();
        }
    }

    /**
     * 年間カレンダーのGET入口が応答する。
     *
     * @return void 応答/表示の期待値をアサートする。
     */
    public function test_calendar_is_available(): void
    {
        $this->get('/calendar')->assertOk()->assertSee('年間カレンダー');
    }
}
