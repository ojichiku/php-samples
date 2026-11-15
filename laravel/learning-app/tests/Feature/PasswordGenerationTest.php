<?php

namespace Tests\Feature;

use App\Services\PasswordGenerator;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** サーバー生成の入力検証、出力エスケープ、非保存、回数制限を確認する。 */
class PasswordGenerationTest extends TestCase
{
    /**
     * 固定ダミーを使い、HTML解釈の防止とセッション/DBへ残さないことを確認する。
     *
     * @return void 画面・ヘッダー・セッション・DBクエリーをアサートする。
     */
    public function test_generation_renders_an_escaped_value_without_session_or_database_storage(): void
    {
        $dummy = '<Dummy&Only>123';
        $this->mock(PasswordGenerator::class)->shouldReceive('generate')->once()
            ->with(16, ['lowercase', 'uppercase', 'numbers'])->andReturn($dummy);
        DB::enableQueryLog();

        $response = $this->post(route('password.generate'), [
            'length' => 16, 'groups' => ['lowercase', 'uppercase', 'numbers'],
        ]);

        $response->assertOk()->assertViewHas('password', $dummy)->assertSee($dummy)
            ->assertDontSee($dummy, false)->assertHeader('Referrer-Policy', 'no-referrer');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertStringNotContainsString($dummy, json_encode(session()->all()));
        $this->assertSame([], DB::getQueryLog());
    }

    /**
     * 文字数、文字種の形、重複、未知キーの拒否ケースを用意する。
     *
     * @return array<string, array{array<string, mixed>, string, string}> POST入力、エラーのキー、期待する日本語メッセージ。
     */
    public static function invalidInputs(): array
    {
        return [
            'too short' => [['length' => 7, 'groups' => ['numbers']], 'length', '文字数は8～64文字で指定してください。'],
            'too long' => [['length' => 65, 'groups' => ['numbers']], 'length', '文字数は8～64文字で指定してください。'],
            'fraction' => [['length' => 12.5, 'groups' => ['numbers']], 'length', '文字数は整数で入力してください。'],
            'text length' => [['length' => 'abc', 'groups' => ['numbers']], 'length', '文字数は整数で入力してください。'],
            'array length' => [['length' => ['16'], 'groups' => ['numbers']], 'length', '文字数は整数で入力してください。'],
            'missing length' => [['groups' => ['numbers']], 'length', '文字数を入力してください。'],
            'no groups' => [['length' => 16], 'groups', '使用する文字種を1つ以上選んでください。'],
            'empty groups' => [['length' => 16, 'groups' => []], 'groups', '使用する文字種を1つ以上選んでください。'],
            'scalar groups' => [['length' => 16, 'groups' => 'numbers'], 'groups', '使用する文字種を選び直してください。'],
            'unknown group' => [['length' => 16, 'groups' => ['unknown']], 'groups.0', '使用できない文字種が指定されています。'],
            'nested group' => [['length' => 16, 'groups' => [['numbers']]], 'groups.0', '使用する文字種を選び直してください。'],
            'duplicate group' => [['length' => 16, 'groups' => ['numbers', 'numbers']], 'groups.0', '同じ文字種を重複して指定できません。'],
            'too many groups' => [['length' => 16, 'groups' => ['lowercase', 'uppercase', 'numbers', 'symbols', 'lowercase']], 'groups', '文字種は用意された4種類から選んでください。'],
            'empty group' => [['length' => 16, 'groups' => ['']], 'groups.0', '使用する文字種を選び直してください。'],
        ];
    }

    /**
     * 不正条件は生成サービスを呼ぶ前に422として拒否する。
     *
     * @param  array<string, mixed>  $input  POSTへ渡す不正入力。
     * @param  string  $field  エラーになる入力キー。
     * @param  string  $message  期待するエラーメッセージ。
     * @return void HTTP422とJSON検証エラーをアサートする。
     */
    #[DataProvider('invalidInputs')]
    public function test_invalid_input_is_rejected_before_generation(array $input, string $field, string $message): void
    {
        $this->mock(PasswordGenerator::class)->shouldNotReceive('generate');

        $this->postJson(route('password.generate'), $input)->assertUnprocessable()
            ->assertJsonValidationErrors([$field => $message]);
    }

    /**
     * 通常フォームの失敗では条件のエラーを付けて入力画面へ戻す。
     *
     * @return void リダイレクトとセッションの検証エラーをアサートする。
     */
    public function test_html_validation_returns_to_the_form_with_options_only(): void
    {
        $this->from(route('password.form'))->post(route('password.generate'), ['length' => 7])
            ->assertRedirect(route('password.form'))->assertSessionHasErrors(['length', 'groups']);
    }

    /**
     * 配列などの不正な旧入力でも画面を壊さずHTMLを挿入させない。
     *
     * @return void HTTP200とエスケープ結果をアサートする。
     */
    public function test_malformed_old_input_cannot_break_the_form_or_inject_html(): void
    {
        $this->withSession(['_old_input' => ['length' => ['<script>'], 'groups' => ['<script>']]])
            ->get(route('password.form'))->assertOk()->assertDontSee('<script>', false);
    }

    /**
     * 30回の許可直後の31回目で回数制限と保存抑止が働くことを確認する。
     *
     * @return void HTTP429、Retry-After、no-storeをアサートする。
     */
    public function test_thirty_requests_are_allowed_and_the_next_is_rate_limited(): void
    {
        $this->mock(PasswordGenerator::class)->shouldReceive('generate')->times(30)->andReturn('Dummy123456789012');
        $input = ['length' => 16, 'groups' => ['numbers']];
        for ($attempt = 0; $attempt < 30; $attempt++) {
            $this->post(route('password.generate'), $input)->assertOk();
        }
        $response = $this->post(route('password.generate'), $input);
        $response->assertTooManyRequests()->assertSee('しばらく待って')->assertHeader('Retry-After');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }
}
