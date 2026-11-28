/** @file テキストファイルの文字コードと改行をブラウザー内で変換する。 */
import Encoding from 'encoding-japanese';

export const inputByteLimit = 5 * 1024 * 1024;
const utf8Bom = Uint8Array.of(0xEF, 0xBB, 0xBF);
// BOMは先頭の1つだけを自分で扱う。本文にあるU+FEFFはそのまま読む。
const utf8Decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const cp932Decoder = new TextDecoder('shift_jis', { fatal: true });
const utf8Encoder = new TextEncoder();
const cp932Replacements = new Map([['—', '―'], ['〜', '～'], ['−', '－']]);
const cp932DetailLimit = 12;

/**
 * @param {File} file 利用者が選んだローカルファイル。
 * @param {'utf8'|'cp932'} encoding 元の文字コード。
 * @returns {Promise<{text: string, hasBom: boolean}>} 読み取った本文と先頭BOMの有無。
 * @throws {Error} 5 MiBを超えるか、読み込みまたは文字コードの検証に失敗した場合。
 */
export async function readSourceFile(file, encoding) {
    if (file.size > inputByteLimit) {
        throw new Error('ファイルが5 MiBの上限を超えています。');
    }
    let bytes;
    try {
        bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
        throw new Error('ファイルを読み込めませんでした。選び直してください。');
    }
    const hasBom = utf8Bom.every((byte, index) => bytes[index] === byte);
    if (hasBom && encoding === 'cp932') {
        throw new Error('UTF-8のBOMが見つかりました。元の文字コードをUTF-8にしてください。');
    }
    try {
        const decoder = encoding === 'utf8' ? utf8Decoder : cp932Decoder;
        return { text: decoder.decode(hasBom ? bytes.subarray(utf8Bom.length) : bytes), hasBom };
    } catch {
        throw new Error(encoding === 'utf8'
            ? 'UTF-8として読み込めません。CP932のファイルの場合は元の文字コードを切り替えてください。'
            : 'Shift_JIS（Windows-31J／CP932）として読み込めません。元の文字コードを確認してください。');
    }
}

/**
 * @param {string} text 元の文字コードで読み取った本文。
 * @returns {{preview: string, truncated: boolean, counts: {crlf: number, lf: number, cr: number}, endsWithNewline: boolean}}
 * 先頭10行・1000コードポイントまでの表示用本文と、ファイル全体の改行集計。
 */
export function inspectText(text) {
    const counts = { crlf: 0, lf: 0, cr: 0 };
    const newlineNames = { '\r\n': 'crlf', '\n': 'lf', '\r': 'cr' };
    let lineBreaks = 0;
    let previewEnd = text.length;
    for (const match of text.matchAll(/\r\n|\n|\r/g)) {
        counts[newlineNames[match[0]]]++;
        lineBreaks++;
        if (lineBreaks === 10) {
            previewEnd = match.index;
        }
    }
    let codePoints = 0;
    let offset = 0;
    // 文字列イテレーターで絵文字などのサロゲートペアを途中で切らない。
    for (const char of text) {
        if (offset >= previewEnd || codePoints === 1000) {
            break;
        }
        codePoints++;
        offset += char.length;
    }
    return {
        preview: text.slice(0, offset),
        truncated: offset < text.length,
        counts,
        endsWithNewline: /[\r\n]$/.test(text),
    };
}

/**
 * @param {string} text CP932で保持できなかった入力本文。
 * @returns {{total: number, omitted: number, canReplace: boolean, issues: Array<{
 *   character: string, replacement: string|null, count: number, positions: Array<{line: number, column: number}>
 * }>}} 出現数、詳細の省略数、置換可否と表示用の位置。行と文字位置は1始まり。
 */
export function inspectCp932Issues(text) {
    const preserved = new Map();
    const issues = new Map();
    let total = 0;
    let omitted = 0;
    let canReplace = true;
    let line = 1;
    let lineStart = 0;
    let supplementary = 0;

    // ASCII本文を飛ばし、同じ文字の変換結果は使い回す。
    for (const { 0: character, index } of text.matchAll(/\r\n|[\r\n]|[^\x00-\x7F]/gu)) {
        if (character[0] === '\r' || character === '\n') {
            line++;
            lineStart = index + character.length;
            supplementary = 0;
            continue;
        }
        const column = index - lineStart - supplementary + 1;
        supplementary += character.length - 1;
        if (!preserved.has(character)) {
            preserved.set(character, encodeCp932(character) !== null);
        }
        if (preserved.get(character)) {
            continue;
        }

        total++;
        const replacement = cp932Replacements.get(character) ?? null;
        canReplace &&= replacement !== null;
        if (!issues.has(character)) {
            if (issues.size === cp932DetailLimit) {
                omitted++;
                continue;
            }
            issues.set(character, { character, replacement, count: 0, positions: [] });
        }
        const issue = issues.get(character);
        issue.count++;
        if (issue.positions.length < cp932DetailLimit) {
            issue.positions.push({ line, column });
        }
    }

    return { total, omitted, canReplace: total > 0 && canReplace, issues: [...issues.values()] };
}

/**
 * @param {string} text 現在の入力本文。
 * @param {Array<{character: string, replacement: string}>} issues 利用者に表示した置換対象と候補。
 * @returns {string} 指定された文字だけを置き換えた出力用の本文。
 */
export function replaceCp932Issues(text, issues) {
    const replacements = new Map(issues.map(({ character, replacement }) => [character, replacement]));
    return text.replace(/[^\x00-\x7F]/gu, character => replacements.get(character) ?? character);
}

/**
 * @param {string} text 改行を含む、または診断用の1文字のUnicode文字列。
 * @returns {Uint8Array|null} CP932で往復できるバイト列。元の文字を保持できない場合はnull。
 */
function encodeCp932(text) {
    try {
        // 既存のCSV出力と同じ変換ライブラリを使い、読み戻した本文も照合する。
        const bytes = Uint8Array.from(Encoding.convert(Encoding.stringToCode(text), {
            to: 'SJIS', from: 'UNICODE', fallback: 'error',
        }));
        return cp932Decoder.decode(bytes) === text ? bytes : null;
    } catch {
        return null;
    }
}

/**
 * @param {string} text 元の文字コードで読み取った本文。
 * @param {'utf8'|'utf8-bom'|'cp932'} encoding 保存先の文字コード。
 * @param {'lf'|'crlf'} newline 保存先の改行形式。
 * @returns {Blob} 保存先の文字コードと改行形式に変換済みのテキストデータ。
 * @throws {Error} CP932への変換時に文字を保てない場合。
 */
export function createOutput(text, encoding, newline) {
    const normalized = text.replace(/\r\n|\n|\r/g, newline === 'lf' ? '\n' : '\r\n');
    if (encoding === 'cp932') {
        const bytes = encodeCp932(normalized);
        if (!bytes) {
            throw new Error('Shift_JIS（Windows-31J／CP932）で元の文字を保てません。UTF-8を選んでください。');
        }
        return new Blob([bytes], { type: 'text/plain' });
    }
    const bytes = utf8Encoder.encode(normalized);
    const parts = encoding === 'utf8-bom' ? [utf8Bom, bytes] : [bytes];
    return new Blob(parts, { type: 'text/plain' });
}

/**
 * @param {string} filename 選択元のファイル名。
 * @returns {string} 元名に-convertedを付けた保存予定名。拡張子のない名前には.txtを使う。
 */
export function convertedFilename(filename) {
    const extensionStart = filename.lastIndexOf('.');
    if (extensionStart <= 0 || extensionStart === filename.length - 1) {
        return `${filename}-converted.txt`;
    }
    return `${filename.slice(0, extensionStart)}-converted${filename.slice(extensionStart)}`;
}
