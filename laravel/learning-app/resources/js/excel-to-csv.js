/** @file ファイル選択・プレビュー・ZIP保存の画面操作を扱う。 */
import '../css/excel-to-csv.css';

const element = id => document.getElementById('excel-' + id);
const fileInput = element('input');
const nextStep = element('input-next');
const previewButton = element('preview-button');
const download = element('download');
const sheetSelect = element('preview-sheet');
const readerModule = () => import('./excel-to-csv-reader.js');
const exportModule = () => import('./excel-to-csv-export.js');
const previewLimit = 100;
let current = null;
let archive = null;
let version = 0;

/**
 * @param {string} id 通知を出す要素の識別子。
 * @param {string} message 表示文言。
 * @param {boolean} error エラー表示にする場合はtrue。
 */
function showStatus(id, message, error = false) {
    element(id).textContent = message;
    element(id).classList.toggle('csv-error', error);
}

/** 古い出力とプレビューを消し、処理中の古い結果も無効にする。 */
function resetPreview() {
    version++;
    archive = null;
    element('preview').hidden = true;
    download.disabled = true;
    previewButton.disabled = !current?.sheets.length;
    nextStep.hidden = previewButton.disabled;
    showStatus('download-status', '');
    showStatus('export-error', '');
}

/** チェック済みの表を最大100行表示する。値は常にテキストとしてDOMに置く。 */
function renderPreview() {
    const { range, rows } = current.sheets[Number(sheetSelect.value)];
    showStatus('range', `元シートの範囲 ${range}。全${rows.length}行 × ${rows[0].length}列（先頭${Math.min(rows.length, previewLimit)}行を表示）`);
    const body = element('rows');
    body.replaceChildren();
    for (const record of rows.slice(0, previewLimit)) {
        const tr = body.insertRow();
        for (const { value } of record) tr.insertCell().textContent = value;
    }
    element('preview').hidden = false;
}

fileInput.addEventListener('change', async () => {
    current = null;
    resetPreview();
    const attempt = version;
    showStatus('filenames', '');
    showStatus('input-status', '');
    element('excluded').hidden = true;
    const file = fileInput.files[0];
    element('input-label').textContent = file ? 'ファイルを選び直す' : 'ファイルを選ぶ';
    showStatus('input-name', file ? `選択中：${file.name}` : 'ファイルが選択されていません');
    if (!file) return;

    showStatus('input-status', 'ファイルを読み込んでいます。');
    try {
        const { readWorkbook } = await readerModule();
        const result = await readWorkbook(file);
        if (attempt !== version) return;
        const { outputNames } = await exportModule();
        if (attempt !== version) return;
        current = { ...result, names: outputNames(file.name, result.sheets) };
        const list = element('excluded-list');
        list.replaceChildren();
        for (const { name, reason } of result.excluded) {
            const li = document.createElement('li');
            li.textContent = `${name}（${reason}）`;
            list.append(li);
        }
        element('excluded').hidden = !result.excluded.length;
        showStatus('input-status', result.sheets.length ? `出力するシートは${result.sheets.length}枚です。` : '出力できるシートがありません。');
        if (!result.sheets.length) return;
        showStatus('filenames', `保存予定名　${current.names.zip}（${current.names.csv.join('、')}）`);
        previewButton.disabled = false;
        nextStep.hidden = false;
    } catch (error) {
        if (attempt === version) showStatus('input-status', error.message || 'ファイルを読み込めません。', true);
    }
});

for (const id of ['encoding', 'quotes']) {
    element(id).addEventListener('change', () => {
        if (current) resetPreview();
    });
}

previewButton.addEventListener('click', async () => {
    if (!current?.sheets.length) return;
    resetPreview();
    const attempt = version;
    previewButton.disabled = true;
    sheetSelect.replaceChildren(...current.sheets.map(({ name }, index) => new Option(name, index)));
    element('preview-warning').hidden = !current.sheets.some(sheet => sheet.rows.some(row =>
        row.some(({ value }) => /^\s*[=+\-@]/.test(value) && !/^\s*[+-]?\d+(?:[.,]\d+)?\s*$/.test(value))));
    renderPreview();
    nextStep.hidden = true;
    try {
        const { createCsvZip } = await exportModule();
        if (attempt !== version) return;
        archive = createCsvZip(current.sheets, current.names, {
            encoding: element('encoding').value,
            quotes: element('quotes').value,
        });
        download.disabled = false;
    } catch (error) {
        if (attempt === version) showStatus('export-error', error.message, true);
    } finally {
        if (attempt === version) previewButton.disabled = false;
    }
});

sheetSelect.addEventListener('change', renderPreview);
download.addEventListener('click', () => {
    if (!archive) return;
    const url = URL.createObjectURL(archive);
    const link = document.createElement('a');
    link.href = url;
    link.download = current.names.zip;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showStatus('download-status', `ダウンロードを開始しました。 ${current.names.zip}`);
});
