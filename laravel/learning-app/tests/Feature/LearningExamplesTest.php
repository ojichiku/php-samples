<?php

namespace Tests\Feature;

use Tests\TestCase;

class LearningExamplesTest extends TestCase
{
    public function test_hello_is_available_directly_and_through_blade(): void
    {
        $this->get('/hello')->assertOk()->assertContent('Hello World!');
        $this->get('/hello/view')->assertOk()->assertSee('<h1>Hello World!</h1>', false);
    }

    public function test_form_starts_without_a_result_and_returns_a_greeting(): void
    {
        $this->get('/learning/greeting')->assertOk()->assertDontSee('id="greeting-result"', false);
        $this->post('/learning/greeting', ['name' => 'サンプル'])->assertOk()
            ->assertSee('こんにちは、サンプルさん！');
        $this->post('/learning/greeting', ['name' => str_repeat('あ', 40)])->assertOk();
    }

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

    public function test_user_input_is_escaped_in_result_and_input_value(): void
    {
        $name = '<script>alert(1)</script>';
        $this->post('/learning/greeting', ['name' => $name])->assertOk()
            ->assertSee($name)->assertDontSee($name, false);
    }
}
