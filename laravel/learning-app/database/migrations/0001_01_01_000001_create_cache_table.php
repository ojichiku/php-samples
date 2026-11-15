<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** DBキャッシュ/ロックのテーブルを作成/削除する標準マイグレーション。 */
return new class extends Migration
{
    /**
     * DBキャッシュ/ロックのテーブルと必要な索引を作る。
     *
     * @return void DBのスキーマを変更する。
     */
    public function up(): void
    {
        Schema::create('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            // expirationは有効期限のUnix時刻（単位：秒）。
            $table->bigInteger('expiration')->index();
        });

        Schema::create('cache_locks', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('owner');
            // expirationは有効期限のUnix時刻（単位：秒）。
            $table->bigInteger('expiration')->index();
        });
    }

    /**
     * 作成したテーブルを存在する場合に削除する。
     *
     * @return void テーブル内のデータも削除される。
     */
    public function down(): void
    {
        Schema::dropIfExists('cache');
        Schema::dropIfExists('cache_locks');
    }
};
