/** @file 入力・ファイル読み込み・Worker実行・結果表示を操作する。 */
import '../css/json-tools.css';
import { INPUT_LIMIT } from './json-tools-engine.js';
import { downloadText } from './text-tools-download.js';

/**
 * @param {string} name json-に続くID。
 * @returns {HTMLElement} 操作対象。
 */
const element = (name) => document.getElementById('json-' + name);
const format = element('format');
const operation = element('operation');
const indent = element('indent');
const dataField = { input: element('text'), file: element('file'), status: element('file-status'), name: '', revision: 0 };
const schemaField = { input: element('schema'), file: element('schema-file'), status: element('schema-file-status'), name: '', revision: 0 };
const status = element('status');
const note = element('note');
const output = element('output');
const preview = element('preview');
const actionStatus = element('action-status');
const run = element('run');
const clear = element('clear');
const copy = element('copy');
const download = element('download');
const operations = {
    json: [
        ['check', '構文チェック'], ['format', '整形'], ['minify', '圧縮'],
        ['generate', 'スキーマのひな形を生成'], ['validate', 'スキーマに照らして検証'], ['csv', 'CSVに変換'],
    ],
    schema: [['schema-check', 'スキーマ定義チェック'], ['format', '整形']],
    jsonl: [['format', '整形']],
};
let result = null;
let reading = 0;
let worker = null;
let timeout;

/** @returns {void} 処理の状態と表示中の結果に合わせてボタンを更新する。 */
function updateControls() {
    const busy = reading > 0 || worker !== null;
    const runtimeAvailable = 'Worker' in window;
    run.disabled = busy || !runtimeAvailable || !dataField.input.value || (operation.value === 'validate' && !schemaField.input.value);
    clear.disabled = busy || ![dataField.input.value, schemaField.input.value, result].some(Boolean);
    copy.disabled = download.disabled = busy || !result?.output;
    format.disabled = operation.disabled = indent.disabled = worker !== null;
    dataField.file.disabled = schemaField.file.disabled = busy;
    dataField.input.readOnly = schemaField.input.readOnly = worker !== null;
}

/** @returns {void} 前の結果を無効化して表示を初期化する。 */
function resetResult() {
    result = null;
    status.textContent = '処理を実行すると結果が表示されます。';
    status.classList.remove('json-error');
    output.hidden = preview.hidden = note.hidden = true;
    output.value = note.textContent = actionStatus.textContent = '';
    element('preview-head').replaceChildren();
    element('preview-body').replaceChildren();
    updateControls();
}

/** @returns {void} 字下げとスキーマ入力欄の表示を更新し、結果を消去する。 */
function changeOperation() {
    element('schema-panel').hidden = operation.value !== 'validate';
    element('indent-panel').hidden = operation.value !== 'format' || format.value === 'jsonl';
    resetResult();
}

/**
 * @param {{input: HTMLTextAreaElement, file: HTMLInputElement, status: HTMLElement, name: string}} field ファイルの読み込み先。
 * @returns {string} 読み込み条件。
 */
function fileHelp(field) {
    return (field === schemaField || format.value === 'schema' ? 'Draft 2020-12、' : '') + 'UTF-8、1 MiBまで。';
}

/** @returns {void} 利用可能な処理、入力ラベル、ファイルの選択条件を更新する。 */
function changeFormat() {
    dataField.revision++;
    operation.replaceChildren(...operations[format.value].map(([value, label]) => new Option(label, value)));
    element('text-label').textContent = format.selectedOptions[0].textContent + '入力';
    dataField.file.accept = format.value === 'jsonl' ? '.jsonl' : '.json';
    dataField.status.textContent = dataField.name || fileHelp(dataField);
    changeOperation();
}

/**
 * UTF-8ファイルを検証し、成功時だけ入力を置き換える。
 * @param {{input: HTMLTextAreaElement, file: HTMLInputElement, status: HTMLElement, name: string}} field 読み込み対象。
 * @returns {Promise<void>} 失敗はファイル欄に表示する。
 */
async function loadFile(field) {
    const file = field.file.files[0];
    if (!file) return;
    field.file.value = '';
    const extension = field.file.accept;
    const revision = field.revision;
    reading++;
    updateControls();
    try {
        if (!file.name.toLowerCase().endsWith(extension)) throw new Error(extension + 'ファイルを選んでください。');
        if (file.size > INPUT_LIMIT) throw new Error('入力は1 MiBまでです。');
        let decoded;
        try {
            decoded = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer());
        } catch {
            throw new Error('UTF-8のファイルとして読み込めませんでした。');
        }
        if (revision !== field.revision) return;
        if (extension === '.jsonl' && decoded.startsWith('\uFEFF')) throw new Error('JSONLでBOMは使用できません。');
        const value = decoded.replace(/^\uFEFF/u, '');
        if (value.startsWith('\uFEFF')) throw new Error('BOMは先頭に1個までです。');
        field.input.value = value;
        field.name = file.name;
        field.status.textContent = file.name;
        resetResult();
    } catch (error) {
        if (revision === field.revision) field.status.textContent = error.message;
    } finally {
        reading--;
        updateControls();
    }
}

/**
 * @param {string[][]} rows 見出しと最大100データ行。
 * @returns {void} セルをテキストで描画する。
 */
function renderPreview(rows) {
    rows.forEach((cells, index) => {
        const line = document.createElement('tr');
        for (const value of cells) {
            const cell = document.createElement(index ? 'td' : 'th');
            cell.textContent = value;
            if (!index) cell.scope = 'col';
            line.append(cell);
        }
        element(index ? 'preview-body' : 'preview-head').append(line);
    });
    preview.hidden = false;
}

/** @returns {string} 結果形式と元ファイル名から求めたファイル名。 */
function outputName() {
    const base = dataField.name.replace(/(?:\.schema)?\.json$|\.jsonl$/iu, '') || 'data';
    return base + result.suffix;
}

/**
 * @param {string} message エラー時の表示。
 * @returns {void} Workerを終了し、操作を再開する。
 */
function stopWorker(message = '') {
    window.clearTimeout(timeout);
    worker?.terminate();
    worker = null;
    if (message) {
        status.textContent = message;
        status.classList.add('json-error');
    }
    updateControls();
}

format.addEventListener('change', changeFormat);
operation.addEventListener('change', changeOperation);
indent.addEventListener('change', resetResult);
for (const field of [dataField, schemaField]) {
    field.file.addEventListener('change', () => loadFile(field));
    field.input.addEventListener('input', () => {
        field.revision++;
        field.name = '';
        field.status.textContent = fileHelp(field);
        resetResult();
    });
}
clear.addEventListener('click', () => {
    for (const field of [dataField, schemaField]) {
        field.input.value = field.file.value = field.name = '';
        field.status.textContent = fileHelp(field);
    }
    resetResult();
});
run.addEventListener('click', () => {
    resetResult();
    try {
        worker = new Worker(new URL('./json-tools-worker.js', import.meta.url), { type: 'module' });
        status.textContent = '処理中…';
        updateControls();
        timeout = window.setTimeout(() => stopWorker('処理時間の上限に達しました。入力やスキーマを見直してください。'), 5000);
        worker.onerror = () => stopWorker('ブラウザー内の処理を開始できませんでした。');
        worker.onmessage = ({ data }) => {
            if (data.error) {
                stopWorker(data.error);
                return;
            }
            result = data;
            status.textContent = [data.message, data.warning].filter(Boolean).join('\n');
            status.classList.toggle('json-error', data.invalid === true);
            note.textContent = data.note ?? '';
            note.hidden = !data.note;
            if (data.preview) {
                renderPreview(data.preview);
            } else if (data.output) {
                output.value = data.output;
                output.hidden = false;
            }
            stopWorker();
        };
        worker.postMessage({
            format: format.value,
            operation: operation.value,
            indentStyle: indent.value,
            input: dataField.input.value,
            schema: schemaField.input.value,
        });
    } catch {
        stopWorker('ブラウザー内の処理を開始できませんでした。');
    }
});
copy.addEventListener('click', async () => {
    const current = result;
    try {
        await navigator.clipboard.writeText(current.output);
        if (result === current) actionStatus.textContent = 'コピーしました。';
    } catch {
        if (result !== current) return;
        // CSVプレビューが表示されているときも原文を手動で選択できるようにする。
        output.hidden = false;
        output.value = current.output;
        output.focus();
        output.select();
        actionStatus.textContent = '結果を選択しました。手動でコピーしてください。';
    }
});
download.addEventListener('click', () => {
    try {
        downloadText(result.output, outputName());
        actionStatus.textContent = 'ダウンロードを開始しました。';
    } catch {
        actionStatus.textContent = 'ダウンロードを開始できませんでした。';
    }
});
format.disabled = operation.disabled = dataField.file.disabled = schemaField.file.disabled = false;
changeFormat();
if (!('Worker' in window)) status.textContent = 'このブラウザーはWeb Workerに対応していません。';
