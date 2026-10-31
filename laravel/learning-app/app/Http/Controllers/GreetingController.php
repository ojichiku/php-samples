<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class GreetingController extends Controller
{
    public function form(): View
    {
        return view('learning.greeting', ['name' => null]);
    }

    public function submit(Request $request): View
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:40'],
        ], [
            'name.required' => '名前を入力してください。',
            'name.string' => '名前は文字列で入力してください。',
            'name.max' => '名前は40文字以内で入力してください。',
        ]);

        return view('learning.greeting', ['name' => $validated['name']]);
    }
}
