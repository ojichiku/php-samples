import './text-tools.js';
import './browser-password.js';

const result = document.querySelector('#generated-password');
const copyButton = document.querySelector('#copy-password');
const status = document.querySelector('#copy-status');

if (result && copyButton && status) {
    copyButton.addEventListener('click', async () => {
        if (!result.value) return;
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(result.value);
            status.textContent = 'コピーしました。';
        } catch {
            result.focus();
            result.select();
            status.textContent = '自動でコピーできませんでした。選択した生成値を手動でコピーしてください。';
        }
    });

    window.addEventListener('pagehide', () => {
        result.value = '';
        copyButton.disabled = true;
        status.textContent = '';
    });

    const error = document.querySelector('.error-box');
    error?.focus();
}
