/** @file ブラウザーパスワード画面の生成条件・結果表示・コピーを管理する。 */
import {generatePasswords, SYMBOL_PRESETS} from './browser-password-engine.js';

const root = document.querySelector('#browser-password-tool');
if (root) {
    const generateButton = root.querySelector('#browser-generate');
    const lengthInput = root.querySelector('#browser-length');
    const countInput = root.querySelector('#browser-count');
    const symbolCheckbox = root.querySelector('input[value="symbols"]');
    const symbolMode = root.querySelector('#browser-symbol-mode');
    const customSymbols = root.querySelector('#browser-custom-symbols');
    const customField = root.querySelector('#browser-custom-field');
    const symbolPreview = root.querySelector('#browser-symbol-preview');
    const status = root.querySelector('#browser-password-status');
    const error = root.querySelector('#browser-password-error');
    const allResults = root.querySelector('#browser-all-results');
    const copyAll = root.querySelector('#browser-copy-all');
    const clearButton = root.querySelector('#browser-clear');
    const empty = root.querySelector('#browser-password-empty');

    /**
     * 生成値とコピー案内を消し、空の結果表示へ戻す。
     *
     * @returns {void} DOMの値を消すが、クリップボードや全メモリーの消去は保証しない。
     */
    function clearResults() {
        allResults.value = '';
        allResults.style.height = '';
        allResults.hidden = true;
        empty.hidden = false;
        copyAll.disabled = true;
        clearButton.disabled = true;
        status.textContent = '';
    }
    /**
     * 記号を使う選択と指定方式に合わせ、入力欄と文字集合の見本を更新する。
     *
     * @returns {void}
     */
    function synchronizeSymbols() {
        symbolMode.disabled = !symbolCheckbox.checked;
        customField.hidden = !symbolCheckbox.checked || symbolMode.value !== 'custom';
        customSymbols.disabled = customField.hidden;
        symbolPreview.textContent = !symbolCheckbox.checked ? '記号は使用しません。' :
            '使用する記号：' + (symbolMode.value === 'custom' ? customSymbols.value : SYMBOL_PRESETS[symbolMode.value]);
    }
    /**
     * 生成値をクリップボードへコピーし、失敗した場合は元の欄を選択する。
     *
     * @param {string} value コピーする生成値。
     * @param {HTMLTextAreaElement} input 失敗時に選択する結果欄。
     * @returns {Promise<void>} コピーまたは手動コピー案内の更新完了。
     */
    async function copy(value, input) {
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(value);
            status.textContent = 'コピーしました。クリップボードの内容は画面を閉じても残る場合があります。';
        } catch {
            input.hidden = false;
            input.focus();
            input.select();
            status.textContent = '自動コピーできませんでした。選択した結果を手動でコピーしてください。';
        }
    }
    // 条件を数値/配列に変換して生成エンジンへ渡す。検証エラーはフォーカス可能な欄へ表示する。
    generateButton.addEventListener('click', () => {
        clearResults();
        error.hidden = true;
        error.textContent = '';
        try {
            const passwords = generatePasswords({
                length: lengthInput.value.trim() === '' ? NaN : Number(lengthInput.value),
                count: countInput.value.trim() === '' ? NaN : Number(countInput.value),
                groups: [...root.querySelectorAll('input[data-character-group]:checked')].map(input => input.value),
                symbolMode: symbolMode.value,
                customSymbols: customSymbols.value,
            });
            allResults.value = passwords.join('\n');
            allResults.hidden = false;
            allResults.style.height = 'auto';
            allResults.style.height = `${allResults.scrollHeight + 2}px`;
            empty.hidden = true;
            copyAll.disabled = false;
            clearButton.disabled = false;
            status.textContent = `${passwords.length}件を生成しました。`;
        } catch (exception) {
            error.textContent = exception.message;
            error.hidden = false;
            error.focus();
        }
    });
    // 生成条件が変わったら以前の生成値を消す。入力欄自体の値は維持する。
    root.querySelectorAll('input, select').forEach(input => {
        if (input === allResults) return;
        input.addEventListener('input', () => {clearResults(); synchronizeSymbols();});
    });
    copyAll.addEventListener('click', () => copy(allResults.value, allResults));
    clearButton.addEventListener('click', clearResults);
    // 折り返し後の行も見えるよう、幅が変わると結果欄の高さを計り直す。
    window.addEventListener('resize', () => {
        if (allResults.hidden) return;
        allResults.style.height = 'auto';
        allResults.style.height = `${allResults.scrollHeight + 2}px`;
    });
    // 離脱時と履歴からの復帰時に生成値を消す。設定条件は維持する。
    window.addEventListener('pagehide', clearResults);
    window.addEventListener('pageshow', clearResults);
    synchronizeSymbols();
    // 乱数機能を確認してから生成ボタンを有効にし、使えない場合は代替乱数へ切り替えない。
    if (globalThis.crypto?.getRandomValues) generateButton.disabled = false;
    else {
        error.textContent = 'このブラウザーでは暗号用途の乱数を利用できないため生成できません。';
        error.hidden = false;
    }
}
