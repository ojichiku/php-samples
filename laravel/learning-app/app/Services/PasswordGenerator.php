<?php

namespace App\Services;

use InvalidArgumentException;
use Random\RandomException;

/** サーバー側のパスワード生成。Controllerから呼び、文字種条件を満たす値を1件返す。 */
class PasswordGenerator
{
    public const CHARACTER_SETS = [
        'lowercase' => 'abcdefghijklmnopqrstuvwxyz',
        'uppercase' => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'numbers' => '0123456789',
        'symbols' => '!#$%&()*+-.:=?@[]^_{|}~',
    ];

    /**
     * 選んだ各文字種を最低1文字含む生成値を返す。
     *
     * @param  int  $length  生成する文字数（8〜64、単位：文字）。
     * @param  list<string>  $groups  CHARACTER_SETSのキー。1種類以上。
     * @return string 指定文字数のASCII生成値。保存や出力はこのサービスでは行わない。
     *
     * @throws InvalidArgumentException 文字数範囲外、空の選択、または未知の文字種の場合。
     * @throws RandomException 乱数源が必要な乱数を供給できない場合。
     */
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
        // 先に各文字種から1文字ずつ選び、選択した種類が必ず含まれるようにする。
        foreach (array_unique($groups) as $group) {
            $characters = self::CHARACTER_SETS[$group];
            $password[] = $characters[random_int(0, strlen($characters) - 1)];
            $pool .= $characters;
        }

        // 残りを全候補から埋める。ブラウザー版の候補棄却方式とは生成手順が異なる。
        while (count($password) < $length) {
            $password[] = $pool[random_int(0, strlen($pool) - 1)];
        }

        // 先頭に必須文字種が並ばないよう、末尾からランダムな位置と交換する。
        for ($index = count($password) - 1; $index > 0; $index--) {
            $swap = random_int(0, $index);
            [$password[$index], $password[$swap]] = [$password[$swap], $password[$index]];
        }

        return implode('', $password);
    }
}
