<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/** db:seedで実行する初期データ投入。通常の画面アクセスでは実行しない。 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Factoryを使ってサンプルユーザー1件をDBへ保存する。
     *
     * @return void 同じメールが既存の場合など、DB制約に違反すれば保存で失敗する。
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }
}
