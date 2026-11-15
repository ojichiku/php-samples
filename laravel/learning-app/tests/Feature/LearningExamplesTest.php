<?php

namespace Tests\Feature;

use Tests\TestCase;

/** 学習用Helloと名前入力の成功/境界/エスケープを確認する。 */
class LearningExamplesTest extends TestCase
{
    /**
     * 直接文字列の応答とBladeの見出しを比較する。
     *
     * @return void 応答/表示の期待値をアサートする。
     */
    public function test_hello_is_available_directly_and_through_blade(): void
    {
        $this->get('/hello')->assertOk()->assertContent('Hello World!');
        $this->get('/hello/view')->assertOk()->assertSee('<h1>Hello World!</h1>', false);
    }

    /**
     * 初回結果なし、名前の表示、日本語40文字の上限内を確認する。
     *
     * @return void 応答/表示の期待値をアサートする。
     */
    public function test_form_starts_without_a_result_and_returns_a_greeting(): void
    {
        $this->get('/learning/greeting')->assertOk()->assertDontSee('id="greeting-result"', false);
        $this->post('/learning/greeting', ['name' => 'サンプル'])->assertOk()
            ->assertSee('こんにちは、サンプルさん！');
        $this->post('/learning/greeting', ['name' => str_repeat('あ', 40)])->assertOk();
    }

    /**
     * 空白/41文字/配列の拒否と、検証後に元の入力を再表示することを確認する。
     *
     * @return void 応答/表示の期待値をアサートする。
     */
    public function test_invalid_input_returns_to_form_with_errors_and_old_input(): void
    {
        foreach (['', '   ', str_repeat('あ', 41), ['unexpected']] as $name) {
            $this->from('/learning/greeting')->post('/learning/greeting', ['name' => $name])
                ->assertRedirect('/learning/greeting')->assertSessionHasErrors('name');
        }

        $longName = str_repeat('あ', 41);
        $this->from('/learning/greeting')->post('/learning/greeting', ['name' => $longName]);
        $this->get('/learning/greeting')->assertOk()->assertSee('名前は40文字以内で入力してください。')
            ->assertSee('value="'.$longName.'"', false);
    }

    /**
     * スクリプトに見える名前も文字列として扱いHTML実行を防ぐ。
     *
     * @return void 応答/表示の期待値をアサートする。
     */
    public function test_user_input_is_escaped_in_result_and_input_value(): void
    {
        $name = '<script>alert(1)</script>';
        $this->post('/learning/greeting', ['name' => $name])->assertOk()
            ->assertSee($name)->assertDontSee($name, false);
    }
}
