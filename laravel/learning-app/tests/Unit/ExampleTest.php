<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/** PHPUnit標準の動作例。trueの基本アサーションだけを確認する。 */
class ExampleTest extends TestCase
{
    /**
     * PHPUnit標準の動作例。trueの基本アサーションだけを確認する。
     *
     * @return void 基本アサーションを実行する。
     */
    public function test_that_true_is_true(): void
    {
        $this->assertTrue(true);
    }
}
