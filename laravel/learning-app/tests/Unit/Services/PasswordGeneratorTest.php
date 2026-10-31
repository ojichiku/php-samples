<?php

namespace Tests\Unit\Services;

use App\Services\PasswordGenerator;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class PasswordGeneratorTest extends TestCase
{
    /** @return iterable<string, array{int, list<string>}> */
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

    /** @return array<string, array{int, array<mixed>}> */
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

    #[DataProvider('invalidOptions')]
    public function test_service_rejects_invalid_options_without_a_framework(int $length, array $groups): void
    {
        $this->expectException(InvalidArgumentException::class);
        (new PasswordGenerator)->generate($length, $groups);
    }
}
