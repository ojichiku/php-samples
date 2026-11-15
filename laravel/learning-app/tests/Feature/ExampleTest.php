<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Laravel標準のHTTPテスト例。トップのHTTP200だけを確認する。 */
class ExampleTest extends TestCase
{
    /**
     * Laravel標準のHTTPテスト例。トップのHTTP200だけを確認する。
     *
     * @return void 基本アサーションを実行する。
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }
}
