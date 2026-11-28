/** @file 基数変換の自動再計算、入力エラー、コピーを扱う。 */
import '../css/radix-converter.css';
import { convertRadixInteger, parseRadix } from './radix-converter-engine.js';

/**
 * @typedef {object} BaseControls
 * @property {HTMLSelectElement} select 定番の基数、または「その他」の選択欄。
 * @property {HTMLElement} field 「その他」のときに表示する欄全体。
 * @property {HTMLInputElement} custom 2〜36の基数を半角数字で入力する欄。
 * @property {HTMLElement} error 自由入力のエラー表示先。
 */

/**
 * @param {'input'|'output'} side 変換元または変換先を示す識別子。
 * @returns {BaseControls} 基数選択と自由入力に対応するDOM要素。
 */
function getBaseControls(side) {
    return {
        select: document.getElementById(`radix-${side}-base`),
        field: document.getElementById(`radix-${side}-custom-field`),
        custom: document.getElementById(`radix-${side}-custom`),
        error: document.getElementById(`radix-${side}-custom-error`),
    };
}

const inputBase = getBaseControls('input');
const outputBase = getBaseControls('output');
const integer = document.getElementById('radix-integer');
const integerError = document.getElementById('radix-integer-error');
const result = document.getElementById('radix-result');
const copy = document.getElementById('radix-copy');
const status = document.getElementById('radix-status');
let revision = 0;

/**
 * @param {HTMLInputElement|HTMLTextAreaElement} input 検証した入力欄。
 * @param {HTMLElement} error 入力欄に対応するエラー表示先。
 * @param {string} message 表示する理由。空文字ならエラーを解除する。
 * @returns {void}
 */
function showError(input, error, message) {
    error.hidden = message === '';
    error.textContent = message;
    if (message === '') input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid', 'true');
}

/**
 * @param {BaseControls} controls 入力側または出力側の基数欄。
 * @returns {number|null} 2〜36の基数。自由入力が空欄か不正ならnull。
 */
function readBase(controls) {
    const isCustom = controls.select.value === 'custom';
    controls.custom.disabled = controls.field.hidden = !isCustom;
    showError(controls.custom, controls.error, '');
    try {
        return parseRadix(isCustom ? controls.custom.value : controls.select.value);
    } catch (failure) {
        showError(controls.custom, controls.error, failure.message);
        return null;
    }
}

/** @returns {void} 現在の設定で再計算し、正常な結果だけをコピー可能にする。 */
function updateResult() {
    revision++;
    status.textContent = result.textContent = '';
    copy.disabled = true;
    showError(integer, integerError, '');

    const fromBase = readBase(inputBase);
    const toBase = readBase(outputBase);
    if (fromBase === null || toBase === null) return;

    try {
        const converted = convertRadixInteger(integer.value, fromBase, toBase);
        result.textContent = converted;
        copy.disabled = converted === '';
    } catch (failure) {
        showError(integer, integerError, failure.message);
    }
}

inputBase.select.addEventListener('change', updateResult);
outputBase.select.addEventListener('change', updateResult);
for (const input of [inputBase.custom, integer, outputBase.custom]) {
    input.addEventListener('input', updateResult);
}

copy.addEventListener('click', async () => {
    const copiedRevision = revision;
    // 入力の更新後に以前のコピー処理が完了しても、古い状態を通知しない。
    try {
        await navigator.clipboard.writeText(result.textContent);
        if (revision === copiedRevision) status.textContent = 'コピーしました。';
    } catch {
        if (revision !== copiedRevision) return;
        result.focus();
        window.getSelection()?.selectAllChildren(result);
        status.textContent = '結果を選択しました。手動でコピーしてください。';
    }
});

updateResult();
