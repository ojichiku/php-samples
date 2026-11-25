/** @file 一般電卓の入出力と、ページ内のメモリ・履歴を管理する。 */
import '../css/general-calculator.css';
import { calculate, EXPRESSION_LIMIT } from './general-calculator-engine.js';

/** @param {string} id 電卓画面内の要素ID。 @returns {HTMLElement} Bladeに定義した要素。 */
const get = (id) => document.getElementById(id);
const field = get('expression');
const calculator = get('calculator');
const mobile = matchMedia('(max-width: 900px)');
const entries = [];
let acceptedExpression = '';
let angle = 'DEG';
let memory = null;
let result = null;

/**
 * 結果表示とは独立して、操作上の通知やエラーを読み上げる。
 * @param {string} [message] 表示するメッセージ。空文字で消去する。
 * @param {boolean} [error] エラー表示にする場合はtrue。
 * @returns {void}
 */
function showFeedback(message = '', error = false) {
    const feedback = get('feedback');
    feedback.hidden = !message;
    feedback.textContent = message;
    feedback.toggleAttribute('data-error', error);
}

/** @returns {void} 現在の式、選択範囲、結果からボタンの有効状態を更新する。 */
function updateButtons() {
    const {value, selectionStart, selectionEnd} = field;
    const latest = entries[0];
    get('cursor-left').disabled = selectionEnd === 0;
    get('cursor-right').disabled = selectionStart === value.length;
    get('backspace').disabled = selectionEnd === 0;
    get('clear').disabled = !value && !get('feedback').hasAttribute('data-error');
    get('calculate').disabled = !value.trim();
    get('restore').disabled = !latest || (value === latest.expression && angle === latest.angle);
    get('copy').disabled = result === null;
    get('memory-save').disabled = result === null;
    get('memory-recall').disabled = memory === null;
    get('memory-clear').disabled = memory === null;
}

/**
 * 計算結果と近似表示を更新する。
 * @param {{text: string, approximate: boolean}|null} value 表示する結果。nullの場合は空欄。
 * @returns {void}
 */
function showResult(value) {
    result = value;
    get('result').textContent = value?.text ?? '—';
    get('approximation').hidden = !value?.approximate;
}

/**
 * 選択を考慮して式を書き換え、以前の計算結果を無効にする。
 * @param {string} value 書き換えた式。
 * @param {number} cursor 文字単位のカーソル位置。
 * @param {boolean} [focus] ポインターから操作した場合に入力欄へフォーカスする。
 * @returns {void}
 */
function setExpression(value, cursor, focus = false) {
    if (value.length > EXPRESSION_LIMIT || /[\r\n]/.test(value)) {
        showFeedback('式は改行を含まない256文字以内で入力してください。', true);
        updateButtons();
        return;
    }
    field.value = acceptedExpression = value;
    if (focus) field.focus({preventScroll: true});
    field.setSelectionRange(cursor, cursor);
    showResult(null);
    showFeedback();
    updateButtons();
}

/**
 * 現在のカーソルまたは選択範囲に文字を入れる。
 * @param {string} value 挿入する文字。
 * @param {boolean} focus 入力欄へフォーカスするかどうか。
 * @param {number} [offset] 挿入末尾から戻す文字数。
 * @param {number} [from] 置き換え開始位置。省略時は選択開始。
 * @returns {void}
 */
function insertAtSelection(value, focus, offset = 0, from = field.selectionStart) {
    const expression = field.value.slice(0, from) + value + field.value.slice(field.selectionEnd);
    setExpression(expression, from + value.length - offset, focus);
}

/**
 * 関数欄を閉じていても現在の角度単位が分かるように表示をそろえる。
 * @param {'DEG'|'RAD'} mode 計算に使う角度単位。
 * @returns {void}
 */
function setAngle(mode) {
    angle = mode;
    document.querySelector(`input[name="angle"][value="${mode}"]`).checked = true;
    get('angle-indicator').textContent = mode === 'DEG' ? '度 DEG' : 'ラジアン RAD';
}

/**
 * 履歴の式と角度を呼び戻し、再計算できる状態にする。
 * @param {{expression: string, angle: 'DEG'|'RAD'}} entry 選んだ履歴。
 * @returns {void}
 */
function restoreEntry(entry) {
    setAngle(entry.angle);
    setExpression(entry.expression, entry.expression.length, true);
    // スマートフォンで履歴から戻した直後に、入力欄が見えるようにする。
    field.scrollIntoView({block: 'nearest'});
}

/** @returns {void} 成功した計算の式、角度単位、結果を新しい順で表示する。 */
function renderHistory() {
    const list = get('history');
    list.replaceChildren();
    for (const entry of entries) {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        const expression = document.createElement('span');
        expression.textContent = entry.expression;
        const caption = document.createElement('small');
        caption.textContent = `${entry.angle}  ${entry.approximate ? '≈' : '='} ${entry.text}`;
        button.append(expression, caption);
        button.addEventListener('click', () => restoreEntry(entry));
        item.append(button);
        list.append(item);
    }
    get('history-count').textContent = `${entries.length}件`;
    get('history-empty').hidden = entries.length > 0;
    get('history-actions').hidden = entries.length === 0;
    get('history-clear').disabled = entries.length === 0;
}

/** @returns {void} 式を計算し、成功時だけ履歴に追加する。 */
function execute() {
    if (!field.value.trim()) return;
    showFeedback();
    try {
        showResult(calculate(field.value, angle));
        entries.unshift({expression: field.value, angle, ...result});
        if (entries.length > 20) entries.pop();
        renderHistory();
    } catch (error) {
        showResult(null);
        showFeedback(error.message, true);
    }
    updateButtons();
}

const useScreenKeys = () => { field.inputMode = mobile.matches ? 'none' : 'text'; };
useScreenKeys();
mobile.addEventListener('change', useScreenKeys);

field.addEventListener('input', () => {
    if (field.value.length > EXPRESSION_LIMIT) {
        field.value = acceptedExpression;
        showFeedback('式は256文字以内で入力してください。', true);
    } else {
        acceptedExpression = field.value;
        showResult(null);
        showFeedback();
    }
    updateButtons();
});
field.addEventListener('paste', (event) => {
    const text = event.clipboardData.getData('text/plain');
    if (/[\r\n]/.test(text)) {
        event.preventDefault();
        showFeedback('改行を含む式は貼り付けできません。', true);
        updateButtons();
    }
});
field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        execute();
    }
});
document.addEventListener('selectionchange', () => {
    if (document.activeElement === field) updateButtons();
});

document.querySelectorAll('input[name="angle"]').forEach((input) => {
    input.addEventListener('change', () => {
        setAngle(input.value);
        showResult(null);
        showFeedback();
        updateButtons();
    });
});

calculator.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const {value, selectionStart, selectionEnd} = field;
    const selected = value.slice(selectionStart, selectionEnd);
    const focus = event.detail > 0;
    if (button.dataset.value !== undefined) insertAtSelection(button.dataset.value, focus);
    if (button.dataset.function) insertAtSelection(`${button.dataset.function}(${selected})`, focus, selected ? 0 : 1);
    if (button.dataset.key === 'percent') insertAtSelection(selected ? `(${selected})%` : '%', focus);
});

get('calculate').addEventListener('click', execute);
get('clear').addEventListener('click', (event) => setExpression('', 0, event.detail > 0));
get('backspace').addEventListener('click', (event) => {
    const {selectionStart, selectionEnd} = field;
    const start = selectionStart === selectionEnd ? Math.max(0, selectionStart - 1) : selectionStart;
    insertAtSelection('', event.detail > 0, 0, start);
});
for (const [id, direction] of [['cursor-left', -1], ['cursor-right', 1]]) {
    get(id).addEventListener('click', (event) => {
        const {selectionStart, selectionEnd} = field;
        const next = selectionStart === selectionEnd
            ? Math.max(0, Math.min(field.value.length, selectionStart + direction))
            : direction < 0 ? selectionStart : selectionEnd;
        if (event.detail > 0) field.focus({preventScroll: true});
        field.setSelectionRange(next, next);
        updateButtons();
    });
}

get('restore').addEventListener('click', () => restoreEntry(entries[0]));
get('history-clear').addEventListener('click', () => {
    entries.length = 0;
    renderHistory();
    updateButtons();
    get('history').closest('details').querySelector('summary').focus();
});

/** @returns {void} 保存値と有効なメモリ操作を表示する。 */
function renderMemory() {
    get('memory-value').querySelector('span').textContent = memory ?? 'なし';
    updateButtons();
}
get('memory-save').addEventListener('click', () => {
    memory = result.text;
    renderMemory();
});
get('memory-clear').addEventListener('click', () => {
    memory = null;
    renderMemory();
});
get('memory-recall').addEventListener('click', (event) => {
    insertAtSelection(memory.startsWith('-') ? `(${memory})` : memory, event.detail > 0);
});

get('copy').addEventListener('click', async () => {
    const copiedResult = result;
    try {
        await navigator.clipboard.writeText(copiedResult.text);
        if (result === copiedResult) showFeedback('結果をコピーしました。');
    } catch {
        if (result !== copiedResult) return;
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(get('result'));
        selection.removeAllRanges();
        selection.addRange(range);
        showFeedback('結果を選択しました。手動でコピーしてください。');
    }
});

updateButtons();

calculator.inert = false;
