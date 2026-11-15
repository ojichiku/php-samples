<?php

namespace Tests\Unit\Services;

use App\Services\PasswordGenerator;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** フレームワークを介さず、サーバー生成の長さ・文字集合・不正条件を検証する。 */
class PasswordGeneratorTest extends TestCase
{
    /**
     * 4文字種の全15組合せと、最小/既定/最大文字数を用意する。
     *
     * @return iterable<string, array{int, list<string>}> ケース名に対応する文字数（文字）と文字種キー。
     */
    public static function selectedGroups(): iterable
    {
        $groups = ['lowercase', 'uppercase', 'numbers', 'symbols'];
        for ($mask = 1; $mask < 16; $mask++) {
            $selected = [];
            foreach ($groups as $index => $group) {
                if ($mask & (1 << $index)) {
                    $selected[] = $group;
                }
            }
            foreach ([8, 16, 64] as $length) {
                yield implode('+', $selected).'-'.$length => [$length, $selected];
            }
        }
    }

    /**
     * 選んだ各種類が含まれ、選んでいない種類が混ざらないことを確認する。
     *
     * @param  int  $length  期待する文字数（単位：文字）。
     * @param  list<string>  $groups  選択する文字種キー。
     * @return void 生成値の長さと文字種をアサートする。
     */
    #[DataProvider('selectedGroups')]
    public function test_output_respects_length_and_exactly_the_selected_character_types(int $length, array $groups): void
    {
        $password = (new PasswordGenerator)->generate($length, $groups);

        $this->assertSame($length, strlen($password));
        foreach (['lowercase' => '/[a-z]/', 'uppercase' => '/[A-Z]/', 'numbers' => '/[0-9]/', 'symbols' => '/[^a-zA-Z0-9]/'] as $group => $pattern) {
            if (in_array($group, $groups, true)) {
                $this->assertMatchesRegularExpression($pattern, $password);
            } else {
                $this->assertDoesNotMatchRegularExpression($pattern, $password);
            }
        }
    }

    /**
     * 境界の外、未選択、未知/文字列以外の文字種を用意する。
     *
     * @return array<string, array{int, array<mixed>}> ケース名に対応する文字数と不正な文字種配列。
     */
    public static function invalidOptions(): array
    {
        return [
            'below minimum' => [7, ['lowercase']],
            'above maximum' => [65, ['lowercase']],
            'no selection' => [16, []],
            'unknown selection' => [16, ['invalid']],
            'non string selection' => [16, [['numbers']]],
        ];
    }

    /**
     * サービス単体でも入力条件の違反を例外で拒否する。
     *
     * @param  int  $length  不正条件を含む文字数（単位：文字）。
     * @param  array<mixed>  $groups  不正条件を含む文字種配列。
     * @return void InvalidArgumentExceptionを期待する。
     */
    #[DataProvider('invalidOptions')]
    public function test_service_rejects_invalid_options_without_a_framework(int $length, array $groups): void
    {
        $this->expectException(InvalidArgumentException::class);
        (new PasswordGenerator)->generate($length, $groups);
    }
}
