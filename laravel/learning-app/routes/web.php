<?php

use App\Http\Controllers\CalendarController;
use App\Http\Controllers\GreetingController;
use App\Http\Controllers\PasswordGeneratorController;
use App\Http\Middleware\BrowserPasswordPolicy;
use App\Http\Middleware\PreventSensitiveResponseCaching;
use Illuminate\Support\Facades\Route;

Route::view('/', 'tools.index')->name('tools.index');
Route::get('/calendar', CalendarController::class)->name('calendar');
Route::view('/password-generator', 'tools.password-guide')->name('password.guide');

Route::middleware(PreventSensitiveResponseCaching::class)->group(function (): void {
    Route::view('/password-generator-browser', 'tools.password-browser')->name('password.browser')
        ->middleware(BrowserPasswordPolicy::class);
    Route::get('/password-generator/generate', [PasswordGeneratorController::class, 'form'])->name('password.form');
    Route::post('/password-generator/generate', [PasswordGeneratorController::class, 'generate'])
        ->middleware('throttle:password-generation')->name('password.generate');
});

Route::get('/hello', function (): string {
    return 'Hello World!';
})->name('learning.hello');

Route::view('/hello/view', 'learning.hello', ['message' => 'Hello World!'])
    ->name('learning.hello.view');

Route::get('/learning/greeting', [GreetingController::class, 'form'])->name('learning.greeting');
Route::post('/learning/greeting', [GreetingController::class, 'submit'])->name('learning.greeting.submit');
