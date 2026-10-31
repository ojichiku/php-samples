<?php

namespace App\Http\Requests;

use App\Services\PasswordGenerator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GeneratePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<mixed>> */
    public function rules(): array
    {
        return [
            'length' => ['required', 'integer', 'between:8,64'],
            'groups' => ['required', 'array', 'min:1', 'max:4'],
            'groups.*' => ['required', 'string', 'distinct', Rule::in(array_keys(PasswordGenerator::CHARACTER_SETS))],
        ];
    }

    /** @return array<string, string> */
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
