/** @file URL変換の入力、結果、コピーをブラウザー内で扱う。 */
import '../css/url-encoding.css';
import { convertUrlText } from './url-encoding-engine.js';

const format = document.getElementById('url-format');
const input = document.getElementById('url-input');
const error = document.getElementById('url-error');
const encode = document.getElementById('url-encode');
const decode = document.getElementById('url-decode');
const result = document.getElementById('url-result');
const copy = document.getElementById('url-copy');
const status = document.getElementById('url-status');
let revision = 0;

/** @returns {void} 現在の入力で使える操作だけを有効にする。 */
function resetResult() {
    revision++;
    result.textContent = '';
    encode.disabled = decode.disabled = input.value === '';
    copy.disabled = true;
    error.textContent = status.textContent = '';
    error.hidden = true;
    input.removeAttribute('aria-invalid');
}

/**
 * @param {boolean} encoding エンコードするときはtrue、デコードするときはfalse。
 * @returns {void} 変換結果を文字として表示する。失敗時は入力を残して理由を表示する。
 */
function run(encoding) {
    resetResult();
    try {
        result.textContent = convertUrlText(input.value, format.value, encoding);
        copy.disabled = false;
        status.textContent = '変換しました。';
    } catch (failure) {
        error.hidden = false;
        error.textContent = failure.message;
        input.setAttribute('aria-invalid', 'true');
    }
}

input.addEventListener('input', resetResult);
format.addEventListener('change', resetResult);
encode.addEventListener('click', () => run(true));
decode.addEventListener('click', () => run(false));

// コピーが完了する前に再入力したときは、前の結果の通知を表示しない。
copy.addEventListener('click', async () => {
    const currentRevision = revision;
    try {
        await navigator.clipboard.writeText(result.textContent);
        if (revision === currentRevision) status.textContent = 'コピーしました。';
    } catch {
        if (revision !== currentRevision) return;
        result.focus();
        window.getSelection()?.selectAllChildren(result);
        status.textContent = '結果を選択しました。手動でコピーしてください。';
    }
});
resetResult();
