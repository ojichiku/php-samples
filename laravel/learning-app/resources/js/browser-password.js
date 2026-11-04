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

    function clearResults() {
        allResults.value = '';
        allResults.style.height = '';
        allResults.hidden = true;
        empty.hidden = false;
        copyAll.disabled = true;
        clearButton.disabled = true;
        status.textContent = '';
    }
    function synchronizeSymbols() {
        symbolMode.disabled = !symbolCheckbox.checked;
        customField.hidden = !symbolCheckbox.checked || symbolMode.value !== 'custom';
        customSymbols.disabled = customField.hidden;
        symbolPreview.textContent = !symbolCheckbox.checked ? '記号は使用しません。' :
            '使用する記号：' + (symbolMode.value === 'custom' ? customSymbols.value : SYMBOL_PRESETS[symbolMode.value]);
    }
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
    root.querySelectorAll('input, select').forEach(input => {
        if (input === allResults) return;
        input.addEventListener('input', () => {clearResults(); synchronizeSymbols();});
    });
    copyAll.addEventListener('click', () => copy(allResults.value, allResults));
    clearButton.addEventListener('click', clearResults);
    window.addEventListener('resize', () => {
        if (allResults.hidden) return;
        allResults.style.height = 'auto';
        allResults.style.height = `${allResults.scrollHeight + 2}px`;
    });
    window.addEventListener('pagehide', clearResults);
    window.addEventListener('pageshow', clearResults);
    synchronizeSymbols();
    if (globalThis.crypto?.getRandomValues) generateButton.disabled = false;
    else {
        error.textContent = 'このブラウザーでは暗号用途の乱数を利用できないため生成できません。';
        error.hidden = false;
    }
}
