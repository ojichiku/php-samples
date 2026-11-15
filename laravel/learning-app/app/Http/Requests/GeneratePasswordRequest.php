<?php

namespace App\Http\Requests;

use App\Services\PasswordGenerator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** 生成前にPOST条件を検証するFormRequest。検証失敗時はControllerの生成処理へ進まない。 */
class GeneratePasswordRequest extends FormRequest
{
    /**
     * この公開ツールの生成要求を許可する。
     *
     * @return bool 常にtrue。入力検証と回数制限は別の仕組みで行う。
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * 文字数と重複のない有効な文字種を要求する。
     *
     * @return array<string, array<mixed>> 入力キーごとの検証ルール。lengthの単位は文字。
     */
    public function rules(): array
    {
        return [
            'length' => ['required', 'integer', 'between:8,64'],
            'groups' => ['required', 'array', 'min:1', 'max:4'],
            'groups.*' => ['required', 'string', 'distinct', Rule::in(array_keys(PasswordGenerator::CHARACTER_SETS))],
        ];
    }

    /**
     * 検証エラーを日本語の案内へ対応させる。
     *
     * @return array<string, string> ルール名をキー、表示文を値とする配列。
     */
    public function messages(): array
    {
        return [
            'length.required' => '文字数を入力してください。',
            'length.integer' => '文字数は整数で入力してください。',
            'length.between' => '文字数は8～64文字で指定してください。',
            'groups.required' => '使用する文字種を1つ以上選んでください。',
            'groups.array' => '使用する文字種を選び直してください。',
            'groups.min' => '使用する文字種を1つ以上選んでください。',
            'groups.max' => '文字種は用意された4種類から選んでください。',
            'groups.*.required' => '使用する文字種を選び直してください。',
            'groups.*.string' => '使用する文字種を選び直してください。',
            'groups.*.distinct' => '同じ文字種を重複して指定できません。',
            'groups.*.in' => '使用できない文字種が指定されています。',
        ];
    }
}
