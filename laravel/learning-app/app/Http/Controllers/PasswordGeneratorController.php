<?php

namespace App\Http\Controllers;

use App\Http\Requests\GeneratePasswordRequest;
use App\Services\PasswordGenerator;
use Illuminate\Contracts\View\View;

class PasswordGeneratorController extends Controller
{
    public function form(): View
    {
        $length = old('length', 16);
        $groups = old('groups', session()->hasOldInput() ? [] : ['lowercase', 'uppercase', 'numbers']);

        return view('tools.password-form', [
            'length' => is_scalar($length) ? (string) $length : '16',
            'groups' => is_array($groups) ? $groups : [],
            'password' => null,
        ]);
    }

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
