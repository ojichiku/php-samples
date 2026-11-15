<?php

namespace App\Http\Controllers;

use App\Http\Requests\GeneratePasswordRequest;
use App\Services\PasswordGenerator;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Random\RandomException;

/** サーバー生成の表示/POST処理と、旧説明URLから現在の入力画面への転送を担当する。 */
class PasswordGeneratorController extends Controller
{
    /**
     * 旧説明URLからサーバー生成の入力画面へ転送する。
     *
     * @return RedirectResponse 現在の入力画面へのリダイレクト。
     */
    public function guide(): RedirectResponse
    {
        return to_route('password.form');
    }

    /**
     * 旧説明URLからブラウザー生成の入力画面へ転送する。
     *
     * @return RedirectResponse ブラウザー生成画面へのリダイレクト。
     */
    public function browserGuide(): RedirectResponse
    {
        return to_route('password.browser');
    }

    /**
     * 初回値または検証エラー後の条件を使い、結果が空の画面を返す。
     *
     * @return View length（文字数）/groups（文字種）/password（null）を渡した画面。
     */
    public function form(): View
    {
        $length = old('length', 16);
        // エラー後に未選択だった場合は、初回の既定チェックを勝手に復元しない。
        $groups = old('groups', session()->hasOldInput() ? [] : ['lowercase', 'uppercase', 'numbers']);

        return view('tools.password-form', [
            'length' => is_scalar($length) ? (string) $length : '16',
            'groups' => is_array($groups) ? $groups : [],
            'password' => null,
        ]);
    }

    /**
     * 検証済みの条件でサーバー生成し、同じ入力画面へ結果を返す。
     *
     * @param  GeneratePasswordRequest  $request  文字数8〜64と文字種の検証を通過したPOST。
     * @param  PasswordGenerator  $generator  1件の生成値を返すサービス。
     * @return View 入力条件と生成値passwordを渡した画面。
     *
     * @throws \InvalidArgumentException サービスへ渡した条件が不正な場合。
     * @throws RandomException 乱数源が失敗した場合。
     */
    public function generate(GeneratePasswordRequest $request, PasswordGenerator $generator): View
    {
        $length = $request->integer('length');
        $groups = array_values($request->validated('groups'));

        return view('tools.password-form', [
            'length' => $length,
            'groups' => $groups,
            'password' => $generator->generate($length, $groups),
        ]);
    }
}
