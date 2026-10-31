<?php

namespace App\Services;

use InvalidArgumentException;

class PasswordGenerator
{
    public const CHARACTER_SETS = [
        'lowercase' => 'abcdefghijklmnopqrstuvwxyz',
        'uppercase' => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'numbers' => '0123456789',
        'symbols' => '!#$%&()*+-.:=?@[]^_{|}~',
    ];

    /** @param list<string> $groups */
    public function generate(int $length, array $groups): string
    {
        if ($length < 8 || $length > 64 || $groups === []) {
            throw new InvalidArgumentException('文字数は8～64文字、文字種は1つ以上指定してください。');
        }

        foreach ($groups as $group) {
            if (! is_string($group) || ! isset(self::CHARACTER_SETS[$group])) {
                throw new InvalidArgumentException('使用できない文字種です。');
            }
        }

        $password = [];
        $pool = '';
        foreach (array_unique($groups) as $group) {
            $characters = self::CHARACTER_SETS[$group];
            $password[] = $characters[random_int(0, strlen($characters) - 1)];
            $pool .= $characters;
        }

        while (count($password) < $length) {
            $password[] = $pool[random_int(0, strlen($pool) - 1)];
        }

        for ($index = count($password) - 1; $index > 0; $index--) {
            $swap = random_int(0, $index);
            [$password[$index], $password[$swap]] = [$password[$swap], $password[$index]];
        }

        return implode('', $password);
    }
}
