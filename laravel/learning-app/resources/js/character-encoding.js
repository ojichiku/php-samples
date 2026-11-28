/** @file 文字コード・改行変換のファイル選択、プレビュー、ダウンロードを制御する。 */
import '../css/character-encoding.css';
import {
    convertedFilename, createOutput, inspectCp932Issues, inspectText, readSourceFile, replaceCp932Issues,
} from './character-encoding-engine.js';

const fileInput = document.getElementById('encoding-file');
const source = document.getElementById('encoding-source');
const target = document.getElementById('encoding-target');
const newline = document.getElementById('encoding-newline');
const preview = document.getElementById('encoding-preview');
const previewHint = document.getElementById('encoding-preview-hint');
const bom = document.getElementById('encoding-bom');
const newlineSummary = document.getElementById('encoding-newline-summary');
const filename = document.getElementById('encoding-filename');
const sourceError = document.getElementById('encoding-source-error');
const targetError = document.getElementById('encoding-target-error');
const targetIssues = document.getElementById('encoding-target-issues');
const targetOmitted = document.getElementById('encoding-target-omitted');
const download = document.getElementById('encoding-download');
const status = document.getElementById('encoding-status');

let readRequest = 0;
let currentInput = null;
let currentOutput = null;

/**
 * @param {HTMLElement} element 表示または非表示にするメッセージ欄。
 * @param {string} message 表示文。空文字の場合は欄を隠す。
 * @returns {void}
 */
function setMessage(element, message) {
    element.textContent = message;
    element.hidden = message === '';
}

/**
 * @param {string} character 対象のUnicode文字1つ。
 * @returns {string} 文字とUnicode番号を併記した表示文。
 */
function describeCharacter(character) {
    const code = character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    return `「${character}」（U+${code}）`;
}

/**
 * @param {ReturnType<typeof inspectCp932Issues>} report CP932で保持できない文字の診断結果。
 * @returns {void}
 */
function showCp932Issues({ issues, omitted }) {
    for (const { character, replacement, count, positions } of issues) {
        const item = document.createElement('li');
        const action = replacement ? ` → ${describeCharacter(replacement)}` : '（置換候補なし）';
        const more = count - positions.length;
        item.textContent = `${describeCharacter(character)}${action}　${count}箇所。`;
        item.append(document.createElement('br'));
        const locations = positions.map(({ line, column }) => `${line}行${column}文字目`);
        if (more) {
            locations.push(`ほか${more}箇所`);
        }
        locations.forEach((location, index) => {
            const position = document.createElement('span');
            position.className = 'encoding-position';
            position.textContent = index === locations.length - 1 ? location : `${location}、`;
            item.append(position);
        });
        targetIssues.append(item);
    }
    targetIssues.hidden = false;
    setMessage(targetOmitted, omitted ? `一覧にない文字がほかに${omitted}箇所あります。` : '');
}

/** @returns {void} 現在の入力と保存設定で出力を作り直し、ダウンロードの可否を更新する。 */
function checkOutput() {
    currentOutput = null;
    download.disabled = true;
    download.textContent = 'ダウンロード';
    status.textContent = '';
    setMessage(filename, '');
    setMessage(targetError, '');
    targetError.classList.remove('encoding-warning');
    targetIssues.replaceChildren();
    targetIssues.hidden = true;
    setMessage(targetOmitted, '');
    if (!currentInput) {
        return;
    }

    let blob;
    try {
        blob = createOutput(currentInput.text, target.value, newline.value);
    } catch (error) {
        if (target.value !== 'cp932') {
            setMessage(targetError, error.message);
            return;
        }
        const report = inspectCp932Issues(currentInput.text);
        if (report.total === 0) {
            setMessage(targetError, error.message);
            return;
        }

        const summary = `Shift_JIS（CP932）で元の文字を保てない箇所が${report.total}件あります。`;
        showCp932Issues(report);
        if (!report.canReplace) {
            setMessage(targetError, `${summary} UTF-8で保存するか、ファイルを修正してください。`);
            return;
        }

        try {
            const replaced = replaceCp932Issues(currentInput.text, report.issues);
            blob = createOutput(replaced, 'cp932', newline.value);
        } catch {
            setMessage(targetError, `${summary} 置換後の内容を保持できないため、UTF-8で保存するか、ファイルを修正してください。`);
            return;
        }
        targetError.classList.add('encoding-warning');
        setMessage(targetError, `${summary} ダウンロードするファイルでは、下記の文字に置き換わります。`);
        download.textContent = '表示のとおり置換してダウンロード';
    }

    currentOutput = { blob, name: convertedFilename(currentInput.name) };
    setMessage(filename, `保存予定名　${currentOutput.name}`);
    download.disabled = false;
}

/** @returns {Promise<void>} 最新の読み込みだけをプレビューと保存用データに反映する。 */
async function showSource() {
    const request = ++readRequest;
    const file = fileInput.files[0];
    currentInput = null;
    checkOutput();
    setMessage(sourceError, '');
    setMessage(bom, '');
    setMessage(newlineSummary, '');
    previewHint.hidden = true;
    if (!file) {
        preview.textContent = 'ファイルを選んでください。';
        return;
    }
    preview.textContent = '読み込み中です。';
    let input;
    try {
        input = await readSourceFile(file, source.value);
    } catch (error) {
        if (request === readRequest) {
            setMessage(sourceError, error.message);
            preview.textContent = 'プレビューを表示できません。';
        }
        return;
    }
    // 再選択している場合は、遅れて終わった読み込みから結果を上書きしない。
    if (request !== readRequest) {
        return;
    }
    const { counts, endsWithNewline, truncated, preview: excerpt } = inspectText(input.text);
    const activeKinds = Object.values(counts).filter(count => count > 0).length;
    const kind = ['改行なし', '改行', '混在', '混在'][activeKinds];
    preview.textContent = excerpt || 'ファイルは空です。';
    previewHint.hidden = !truncated;
    setMessage(bom, input.hasBom ? 'UTF-8 BOMあり' : 'UTF-8 BOMなし');
    setMessage(newlineSummary, `${kind}：CRLF ${counts.crlf}件、LF ${counts.lf}件、CR ${counts.cr}件。末尾改行${endsWithNewline ? 'あり' : 'なし'}。`);
    currentInput = { name: file.name, text: input.text };
    checkOutput();
}

/** @returns {void} 検証済みデータのダウンロードをブラウザーへ依頼する。 */
function downloadCurrentOutput() {
    if (!currentOutput) {
        return;
    }
    let url;
    const link = document.createElement('a');
    try {
        url = URL.createObjectURL(currentOutput.blob);
        link.href = url;
        link.download = currentOutput.name;
        link.hidden = true;
        document.body.append(link);
        link.click();
        // 保存開始前にURLを解放しないよう短時間保持する。
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        status.textContent = 'ダウンロードを開始しました。';
    } catch {
        if (url) {
            URL.revokeObjectURL(url);
        }
        status.textContent = 'ダウンロードを開始できませんでした。';
    } finally {
        link.remove();
    }
}

fileInput.addEventListener('change', showSource);
source.addEventListener('change', showSource);
target.addEventListener('change', checkOutput);
newline.addEventListener('change', checkOutput);
download.addEventListener('click', downloadCurrentOutput);
