/** @file シートの表示値をCSVに変換し、日本語の保存名を含むZIPにまとめる。 */
import Encoding from 'encoding-japanese';
import { storeZip } from './tabular-data-zip.js';

const shiftJisDecoder = new TextDecoder('shift_jis', { fatal: true });
const outputLimit = 32 * 1024 * 1024;

/**
 * @param {string} value 保存名に使用する名前。
 * @returns {string} 一般的なOSで使えるファイル名の部分文字列。
 */
function safeName(value) {
    const name = value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim().replace(/[. ]+$/, '').slice(0, 80);
    return !name || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name) ? '_' + name : name;
}

/**
 * @param {string} filename 入力ファイル名。
 * @param {{name: string}[]} sheets 出力対象のシート。
 * @returns {{zip: string, csv: string[]}} ZIP名と中のCSV名。
 */
export function outputNames(filename, sheets) {
    const base = safeName(filename.replace(/\.[^.]+$/, ''));
    const used = new Set();
    const csv = sheets.map(({ name }) => {
        const stem = sheets.length === 1 ? base : base + '_' + safeName(name);
        let candidate = stem;
        for (let count = 2; used.has(candidate.toLowerCase()); count++) candidate = stem + '_' + count;
        used.add(candidate.toLowerCase());
        return candidate + '.csv';
    });
    return { zip: base + '.zip', csv };
}

/**
 * @param {string} value UnicodeのCSV項目。
 * @returns {Uint8Array} CP932へ変換したバイト列。
 * @throws {Error} 対応できない文字や往復変換で変わる文字がある場合。
 */
function encodeShiftJis(value) {
    const bytes = Uint8Array.from(Encoding.convert(Encoding.stringToCode(value), {
        to: 'SJIS', from: 'UNICODE', fallback: 'error',
    }));
    if (shiftJisDecoder.decode(bytes) !== value) throw new Error('文字が変わります。');
    return bytes;
}

/**
 * @param {{name: string, rows: {value: string, address: string}[][]}[]} sheets 出力する値と元のセル位置。
 * @param {{csv: string[]}} names 出力するCSV名。
 * @param {{encoding: string, quotes: string}} settings CSVの文字コードと引用符設定。
 * @returns {Blob} 内容を検証済みのCSVをまとめたZIP。
 * @throws {Error} 設定に適合しないセルがある場合。エラーはシート名とセル位置を含む。
 */
export function createCsvZip(sheets, names, settings) {
    const entries = Object.create(null);
    let totalBytes = 0;
    sheets.forEach((sheet, index) => {
        const lines = sheet.rows.map(row => row.map(({ value, address }) => {
            totalBytes += 3 * value.length + 4;
            if (totalBytes > outputLimit) throw new Error('出力データが大きすぎます。ファイルを分けてください。');
            const requiresQuote = /[,"\r\n]/.test(value);
            if (requiresQuote && settings.quotes === 'none') {
                throw new Error(`${sheet.name}シートの${address}に、引用符で囲む必要がある文字があります。`);
            }
            if (settings.encoding === 'sjis') {
                try {
                    encodeShiftJis(value);
                } catch {
                    throw new Error(`${sheet.name}シートの${address}に、Shift_JISで保存できない文字があります。`);
                }
            }
            return requiresQuote || settings.quotes === 'all' ? '"' + value.replaceAll('"', '""') + '"' : value;
        }).join(','));
        const csv = lines.join('\r\n') + '\r\n';
        entries[names.csv[index]] = settings.encoding === 'sjis' ? encodeShiftJis(csv) :
            settings.encoding === 'bom' ? '\uFEFF' + csv : csv;
    });
    return storeZip(entries, 'application/zip');
}
