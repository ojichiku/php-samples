/** @file ファイル選択から点検・プレビュー・ダウンロードまでの画面操作を扱う。 */

import { checkTabularData, previewRowLimit, readTabularFile } from './tabular-data-parser.js';
import { createSpreadsheet, spreadsheetError } from './tabular-data-spreadsheet.js';
import '../css/tabular-data-converter.css';

const fileInput = document.querySelector('#input-file');
const inputFormat = document.querySelector('#input-format');
const encoding = document.querySelector('#encoding');
const quotes = document.querySelector('#quotes');
const format = document.querySelector('#format');
const check = document.querySelector('#check');
const output = document.querySelector('#output');
const message = document.querySelector('#output-message');
const status = document.querySelector('#announcement');
const result = document.querySelector('#result');
const summary = document.querySelector('#summary');
const settings = document.querySelector('#checked-settings');
const issues = document.querySelector('#issues');
const preview = document.querySelector('#preview');
const head = document.querySelector('#head');
const body = document.querySelector('#body');

let attempt = 0;
let checked = null;

/**
 * @param {string} announcement 入力変更後に表示する案内。
 * @returns {void}
 */
function resetCheck(announcement) {
    // 古いファイルの非同期読み込みが完了しても、新しい結果へ反映させない。
    attempt += 1;
    checked = null;
    result.hidden = true;
    output.disabled = true;
    check.disabled = !fileInput.files.length;
    message.textContent = '';
    status.textContent = announcement;
    head.replaceChildren();
    body.replaceChildren();
}

/**
 * @returns {string} 現在選択中の出力形式に合わせた保存ファイル名。
 */
function outputName() {
    const name = fileInput.files[0].name.replace(/\.[^.]+$/, '');
    return `${name || '表データ'}.${format.value}`;
}

/**
 * 点検結果と出力形式を照合してボタンを更新する。
 * @returns {void}
 */
function updateOutput() {
    output.disabled = true;
    message.textContent = '';
    if (!checked || checked.errors.length > 0) return;

    const error = spreadsheetError(checked.records, format.value);
    output.disabled = Boolean(error);
    message.textContent = error || `保存するファイル名：${outputName()}`;
}

/**
 * @param {HTMLTableSectionElement} parent 行を追加するテーブル区画。
 * @param {string[]} record 追加するレコードのセル値。
 * @param {'th'|'td'} tag セルのHTML要素名。
 * @returns {void}
 */
function appendRow(parent, record, tag) {
    const row = parent.insertRow();
    for (const value of record) {
        const cell = document.createElement(tag);
        if (tag === 'th') cell.scope = 'col';
        cell.textContent = value;
        row.append(cell);
    }
}

/**
 * 選択中の設定の表示名を取得する。
 * @param {HTMLSelectElement} select 入力設定の選択欄。
 * @returns {string} 画面に表示される選択肢名。
 */
function optionLabel(select) {
    return select.selectedOptions[0].textContent;
}

/**
 * 点検結果と、先頭100件の読み取れたデータ行を表示する。
 * @returns {void}
 */
function renderResult() {
    const { records, errors, dataRows, emptyCells, leadingZeroCells } = checked;
    result.hidden = false;
    summary.classList.toggle('error', errors.length > 0);
    summary.textContent = errors.length > 0
        ? '変換できません。次の項目を確認してください。'
        : `${dataRows.toLocaleString('ja-JP')}データ行・${records[0].length}列を確認しました。`;
    status.textContent = errors.length > 0 ? 'チェックで問題が見つかりました。' : 'チェックが完了しました。';
    settings.textContent = `${optionLabel(inputFormat)} ／ ${optionLabel(encoding)} ／ ${optionLabel(quotes)}`;
    issues.replaceChildren();
    const findings = [...errors];
    if (emptyCells) findings.push(`空欄セルが${emptyCells.toLocaleString('ja-JP')}件あります。`);
    if (leadingZeroCells) findings.push(`先頭ゼロを含むセルが${leadingZeroCells.toLocaleString('ja-JP')}件あります。`);
    for (const finding of findings) {
        const item = document.createElement('li');
        item.textContent = finding;
        issues.append(item);
    }
    issues.hidden = findings.length === 0;

    preview.hidden = records.length === 0;
    if (records.length > 0) {
        const [header, ...rows] = records.slice(0, previewRowLimit + 1);
        document.querySelector('#preview-count').textContent = `プレビュー（${rows.length}データ行）`;
        appendRow(head, header, 'th');
        for (const row of rows) appendRow(body, row, 'td');
    }
    updateOutput();
}

fileInput.addEventListener('change', () => {
    const extension = fileInput.files[0]?.name.match(/\.(csv|tsv)$/i)?.[1].toLowerCase();
    inputFormat.value = ['csv', 'tsv'].includes(extension) ? extension : '';
    resetCheck(fileInput.files.length ? '入力設定を確認して、ファイルをチェックしてください。' : '');
});

for (const select of [inputFormat, encoding, quotes]) {
    select.addEventListener('change', () => {
        resetCheck(fileInput.files.length ? '入力設定を変更しました。再チェックしてください。' : '');
    });
}

format.addEventListener('change', updateOutput);

check.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!inputFormat.value) {
        status.textContent = '入力形式でCSVまたはTSVを選んでください。';
        inputFormat.focus();
        return;
    }
    resetCheck('ファイルをチェックしています。');
    check.disabled = true;
    const currentAttempt = attempt;
    try {
        const source = await readTabularFile(file, encoding.value);
        if (currentAttempt !== attempt) return;
        checked = checkTabularData(source, inputFormat.value === 'csv' ? ',' : '\t', quotes.value === 'quoted');
    } catch (error) {
        if (currentAttempt !== attempt) return;
        checked = { records: [], errors: [error.message], emptyCells: 0, leadingZeroCells: 0 };
    }
    check.disabled = false;
    renderResult();
});

output.addEventListener('click', () => {
    if (output.disabled || !checked) return;
    try {
        const file = createSpreadsheet(checked.records, format.value);
        const url = URL.createObjectURL(file);
        const download = document.createElement('a');
        download.href = url;
        download.download = outputName();
        document.body.append(download);
        download.click();
        download.remove();
        // ブラウザーがURLを参照できるよう、クリック処理の後に破棄する。
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        message.textContent = `ダウンロードを開始しました：${download.download}`;
    } catch {
        message.textContent = 'ファイルを生成できませんでした。再チェックしてからお試しください。';
    }
});
