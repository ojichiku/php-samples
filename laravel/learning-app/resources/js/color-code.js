/** @file 色コードの入力、色見本、結果のコピーをブラウザー内で扱う。 */
import '../css/color-code.css';
import { convertColorCode } from './color-code-engine.js';

const input = document.getElementById('color-input');
const error = document.getElementById('color-error');
const swatch = document.getElementById('color-swatch');
const swatchHint = document.getElementById('color-swatch-hint');
const status = document.getElementById('color-status');
const formats = ['hex', 'rgb'].map(key => ({
    key,
    result: document.getElementById(`color-${key}`),
    copy: document.getElementById(`color-copy-${key}`),
}));
let revision = 0;

/** @returns {void} 入力に応じ、色見本・変換結果・コピーの状態を更新する。 */
function renderColor() {
    revision++;
    error.hidden = true;
    error.textContent = status.textContent = '';
    input.removeAttribute('aria-invalid');

    let color;
    try {
        color = convertColorCode(input.value);
    } catch (failure) {
        error.hidden = false;
        error.textContent = failure.message;
        input.setAttribute('aria-invalid', 'true');
    }

    // 変換で得た6桁HEXだけを、背景色の指定に使う。
    swatch.style.backgroundColor = color?.hex ?? '';
    swatchHint.hidden = Boolean(color);
    for (const { key, result, copy } of formats) {
        result.textContent = color?.[key] ?? '';
        copy.disabled = !color;
    }
}

for (const { key, result, copy } of formats) {
    copy.addEventListener('click', async () => {
        const currentRevision = ++revision;
        status.textContent = '';
        // 待機中に入力やコピー対象が変わった場合、古い操作の通知を表示しない。
        try {
            await navigator.clipboard.writeText(result.textContent);
            if (revision === currentRevision) status.textContent = `${key.toUpperCase()}をコピーしました。`;
        } catch {
            if (revision !== currentRevision) return;
            result.focus();
            window.getSelection()?.selectAllChildren(result);
            status.textContent = '結果を選択しました。手動でコピーしてください。';
        }
    });
}

input.addEventListener('input', renderColor);
renderColor();
