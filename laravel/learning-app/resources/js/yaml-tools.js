/** @file YAMLの入力、実行状態、結果表示と保存を管理する。 */
import '../css/json-tools.css';
import '../css/yaml-tools.css';
import { INPUT_LIMIT } from './json-tools-engine.js';
import { downloadText } from './text-tools-download.js';

const element = name => document.getElementById('yaml-' + name);
const format = element('format');
const file = element('file');
const fileStatus = element('file-status');
const input = element('text');
const operation = element('operation');
const indent = element('indent');
const status = element('status');
const output = element('output');
const actionStatus = element('action-status');
const run = element('run');
const clear = element('clear');
const copy = element('copy');
const download = element('download');

const operations = {
    yaml: [['check', '構文チェック'], ['format', '整形'], ['to-json', 'JSONに変換']],
    json: [['to-yaml', 'YAMLに変換']],
};
const guidance = {
    check: 'YAMLの書き方を確認します。各アプリで設定として使えるかは、そのアプリで確認してください。',
    format: 'コメントを残して字下げをそろえます。',
    'to-json': 'コメントはJSONに引き継がれません。',
    'to-yaml': '文字列・数値・真偽値などの型を保って変換します。',
};

let fileName = '';
let fileRevision = 0;
let reading = false;
let result = null;
let worker = null;
let timeout;

/** @returns {void} 現在の操作と結果に合わせて各操作の可否を更新。 */
function updateControls() {
    run.disabled = reading || worker !== null || !input.value.trim() || !('Worker' in window);
    clear.disabled = !reading && worker === null && !input.value && !result;
    copy.disabled = download.disabled = reading || !result?.output;
    operation.disabled = operations[format.value].length === 1;
}

/** @returns {void} Workerを中断し、以前の入力の結果を無効にする。 */
function stopWorker() {
    clearTimeout(timeout);
    worker?.terminate();
    worker = null;
}

/** @returns {void} 入力・条件の変更後、古い出力を保存できないようにする。 */
function resetResult() {
    stopWorker();
    result = null;
    status.textContent = '処理を実行すると結果が表示されます。';
    status.classList.remove('json-error');
    actionStatus.textContent = '';
    output.value = '';
    output.hidden = true;
    updateControls();
}

/** @returns {void} 指定処理に必要な字下げ欄と案内を表示。 */
function changeOperation() {
    element('indent-panel').hidden = !['format', 'to-yaml'].includes(operation.value);
    element('operation-help').textContent = guidance[operation.value];
    resetResult();
}

/** @returns {string} 選択した入力形式に対応するファイル条件。 */
function fileHelp() {
    return (format.value === 'yaml' ? '.yaml・.yml' : '.json') + '、UTF-8、1 MiBまで。';
}

/** @returns {void} 後から届くファイルの読み込み結果を無効化。 */
function cancelFileRead() {
    fileRevision++;
    reading = false;
    file.value = '';
    fileStatus.textContent = fileName || fileHelp();
}

/** @returns {void} 形式に応じて選択できる処理とファイル条件を切り替える。 */
function changeFormat() {
    cancelFileRead();
    operation.replaceChildren(...operations[format.value].map(([value, label]) => new Option(label, value)));
    file.accept = format.value === 'yaml' ? '.yaml,.yml' : '.json';
    changeOperation();
}

/** @returns {Promise<void>} UTF-8の入力を読み、成功した場合だけ置き換える。 */
async function loadFile() {
    const selected = file.files[0];
    if (!selected) return;
    const revision = ++fileRevision;
    file.value = '';
    reading = true;
    fileStatus.textContent = '読み込んでいます。';
    updateControls();
    try {
        const name = selected.name.toLowerCase();
        if (!file.accept.split(',').some(extension => name.endsWith(extension))) {
            throw new Error(fileHelp() + ' 対応する拡張子のファイルを選んでください。');
        }
        if (selected.size > INPUT_LIMIT) throw new Error('入力は1 MiBまでです。');
        const bytes = await selected.arrayBuffer();
        if (revision !== fileRevision) return;
        let text;
        try {
            text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes).replace(/^\uFEFF/, '');
        } catch {
            throw new Error('UTF-8のファイルとして読み込めませんでした。');
        }
        if (text.startsWith('\uFEFF')) throw new Error('BOMは先頭に1個までです。');
        input.value = text;
        fileName = selected.name;
        fileStatus.textContent = fileName;
        resetResult();
    } catch (error) {
        if (revision === fileRevision) fileStatus.textContent = error.message;
    } finally {
        if (revision === fileRevision) {
            reading = false;
            updateControls();
        }
    }
}

/**
 * @param {{message?: string, error?: string, output?: string, suffix?: string}} data Workerの結果またはエラー。
 * @returns {void} 現在の処理の結果を画面に表示。
 */
function showResult(data) {
    stopWorker();
    status.textContent = data.error ?? data.message;
    status.classList.toggle('json-error', Boolean(data.error));
    result = data.error ? null : data;
    output.value = result?.output ?? '';
    output.hidden = !result?.output;
    updateControls();
}

format.addEventListener('change', changeFormat);
operation.addEventListener('change', changeOperation);
indent.addEventListener('change', resetResult);
file.addEventListener('change', loadFile);
input.addEventListener('input', () => {
    fileName = '';
    cancelFileRead();
    resetResult();
});
clear.addEventListener('click', () => {
    fileName = input.value = '';
    cancelFileRead();
    resetResult();
    input.focus();
});
run.addEventListener('click', () => {
    resetResult();
    try {
        const active = new Worker(new URL('./yaml-tools-worker.js', import.meta.url), { type: 'module' });
        worker = active;
        status.textContent = '処理中…';
        updateControls();
        timeout = setTimeout(() => showResult({ error: '処理時間の上限に達しました。入力を見直してください。' }), 5000);
        active.onmessage = ({ data }) => { if (worker === active) showResult(data); };
        active.onerror = () => { if (worker === active) showResult({ error: 'ブラウザー内の処理を開始できませんでした。' }); };
        active.postMessage({ format: format.value, operation: operation.value, input: input.value, indent: Number(indent.value) });
    } catch {
        showResult({ error: 'ブラウザー内の処理を開始できませんでした。' });
    }
});
copy.addEventListener('click', async () => {
    const current = result;
    try {
        await navigator.clipboard.writeText(current.output);
        if (result === current) actionStatus.textContent = 'コピーしました。';
    } catch {
        if (result !== current) return;
        output.focus();
        output.select();
        actionStatus.textContent = '結果を選択しました。手動でコピーしてください。';
    }
});
download.addEventListener('click', () => {
    const base = fileName.replace(/\.(?:ya?ml|json)$/i, '') || 'data';
    try {
        downloadText(result.output, base + result.suffix);
        actionStatus.textContent = 'ダウンロードを開始しました。';
    } catch {
        actionStatus.textContent = 'ダウンロードを開始できませんでした。';
    }
});

format.disabled = file.disabled = indent.disabled = false;
changeFormat();
if (!('Worker' in window)) status.textContent = 'このブラウザーはWeb Workerに対応していません。';
