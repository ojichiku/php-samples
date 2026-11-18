<?php

use App\Http\Controllers\CalendarController;
use App\Http\Controllers\GreetingController;
use App\Http\Controllers\PasswordGeneratorController;
use App\Http\Middleware\BrowserPasswordPolicy;
use App\Http\Middleware\PreventSensitiveResponseCaching;
use Illuminate\Support\Facades\Route;

// URLと表示画面/Controllerを結び付ける。Route::viewのツールはGET表示のみで、計算はブラウザーが担当する。
Route::view('/', 'tools.index')->name('tools.index');
Route::view('/text-tools', 'tools.text-tools')->name('text.tools');
Route::view('/unit-converter', 'tools.unit-converter')->name('unit.converter');
Route::view('/calculation-tools', 'tools.calculation-tools')->name('calculation.tools');
Route::view('/time-tools', 'tools.time-tools')->name('time.tools');
Route::view('/date-tools', 'tools.date-tools')->name('date.tools');
Route::get('/calendar', CalendarController::class)->name('calendar');
Route::get('/password-generator', [PasswordGeneratorController::class, 'guide'])->name('password.guide');

Route::get('/password-generator-browser/guide', [PasswordGeneratorController::class, 'browserGuide'])->name('password.browser.guide');

// 生成画面には機密応答ヘッダーを付ける。サーバー生成POSTだけに生成回数制限を適用する。
Route::middleware(PreventSensitiveResponseCaching::class)->group(function (): void {
    Route::view('/password-generator-browser', 'tools.password-browser')->name('password.browser')
        ->middleware(BrowserPasswordPolicy::class);
    Route::get('/password-generator/generate', [PasswordGeneratorController::class, 'form'])->name('password.form');
    Route::post('/password-generator/generate', [PasswordGeneratorController::class, 'generate'])
        ->middleware('throttle:password-generation')->name('password.generate');
});

// 学習用のGET/POST入口。挨拶POSTはControllerで名前を検証し、同じBladeへ渡す。
Route::get('/hello', function (): string {
    return 'Hello World!';
})->name('learning.hello');

Route::view('/hello/view', 'learning.hello', ['message' => 'Hello World!'])
    ->name('learning.hello.view');

Route::get('/learning/greeting', [GreetingController::class, 'form'])->name('learning.greeting');
Route::post('/learning/greeting', [GreetingController::class, 'submit'])->name('learning.greeting.submit');
