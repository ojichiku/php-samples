<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * テスト/初期データ用のUserを組み立てる。定義しただけではDBへ保存せず、create時に保存する。
 *
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * 複数ユーザー生成時に共用する、テスト用パスワードのハッシュ。
     */
    protected static ?string $password;

    /**
     * ダミー名/重複しないメール/検証日時/ハッシュ済みパスワード/トークンの既定値を返す。
     *
     * @return array<string, mixed> Userの初期属性。日時はCarbon、passwordはハッシュ文字列。
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * メール未検証の属性を追加したFactoryを返す。
     *
     * @return static email_verified_atをnullへ設定するFactory。
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
