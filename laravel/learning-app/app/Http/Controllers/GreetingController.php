<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * 名前入力の学習画面を担当し、GETではフォーム、POSTでは検証後の挨拶を表示する。
 * 表示する値は learning.greeting のBladeへ渡す。
 */
class GreetingController extends Controller
{
    /**
     * 名前が未入力の状態として、結果を表示しないフォームを返す。
     *
     * @return View 名前をnullとして渡した挨拶画面。
     */
    public function form(): View
    {
        return view('learning.greeting', ['name' => null]);
    }

    /**
     * リクエストの名前を検証し、挨拶画面へ表示する値を渡す。
     * 検証に失敗した場合の入力の戻しとエラー表示はLaravelの仕組みに任せる。
     *
     * @param  Request  $request  名前をnameとして受け取るHTTPリクエスト。名前は必須で40文字以内。
     * @return View 検証済みの名前を渡した挨拶画面。
     *
     * @throws ValidationException 名前が未入力、文字列以外、または40文字を超える場合。
     */
    public function submit(Request $request): View
    {
        // ブラウザー側の入力制限だけに頼らず、受け取った名前をサーバーでも検証する。
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:40'],
        ], [
            'name.required' => '名前を入力してください。',
            'name.string' => '名前は文字列で入力してください。',
            'name.max' => '名前は40文字以内で入力してください。',
        ]);

        // 検証済みの値をBladeへ渡す。HTMLへのエスケープはBlade側で行う。
        return view('learning.greeting', ['name' => $validated['name']]);
    }
}
