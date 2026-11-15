/** @file Viteの共通入口。各ツールを読み込み、サーバー生成画面のコピーと離脱時の結果消去も行う。 */
import './unit-converter.js';
import './date-tools.js';
import './text-tools.js';
import './browser-password.js';

const result = document.querySelector('#generated-password');
const copyButton = document.querySelector('#copy-password');
const status = document.querySelector('#copy-status');

if (result && copyButton && status) {
    // コピーAPIが使えない場合は結果欄を選択して手動コピーへ案内する。
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

    // 履歴キャッシュへの退避でも生成値を消す。クリップボードの値はここでは消去できない。
    window.addEventListener('pagehide', () => {
        result.value = '';
        copyButton.disabled = true;
        status.textContent = '';
    });

    const error = document.querySelector('.error-box');
    error?.focus();
}
