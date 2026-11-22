/** @file テキストセルだけを持つ単一シートの .xlsx / .ods を作る。 */

import { storeZip } from './tabular-data-zip.js';

const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
const sheetNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relationNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageNs = 'http://schemas.openxmlformats.org/package/2006';
const odsMime = 'application/vnd.oasis.opendocument.spreadsheet';
const odfNs = 'urn:oasis:names:tc:opendocument:xmlns:';
const sheetName = 'data';
const excelCellLimit = 32767;
const xmlText = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/**
 * @param {string} value セルの入力文字列。
 * @returns {string} XMLのテキストノードとしてエスケープした文字列。
 */
function escapeXml(value) {
    return value.replace(/[&<>]/g, character => xmlText[character]);
}

/**
 * @param {number} column ゼロから数えた列。
 * @returns {string} A、Z、AAのようなExcelの列記号。
 */
function columnName(column) {
    let name = '';
    for (let index = column + 1; index > 0; index = Math.floor((index - 1) / 26)) {
        name = String.fromCharCode(65 + ((index - 1) % 26)) + name;
    }
    return name;
}

/**
 * Excelのエスケープ構文に見える入力も文字列として残し、XMLで使えない文字を符号化する。
 * @param {string} value セルの入力文字列。
 * @returns {string} OOXMLのインライン文字列に埋め込むテキスト。
 */
function xlsxText(value) {
    const escaped = value.replace(/_x[\da-f]{4}_/gi, match => '_x005F_' + match.slice(1));
    return escapeXml(escaped).replace(/[\u0000-\u0008\u000b-\u001f\ufffe\uffff]/g, character =>
        '_x' + character.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') + '_',
    );
}

/**
 * @param {string[][]} records 見出しを含むセルの配列。
 * @returns {Blob} OOXMLのスプレッドシート。
 */
function xlsxFile(records) {
    const columns = records[0].map((_, index) => columnName(index));
    // t="inlineStr"で保存し、先頭ゼロや数式に見える値を文字列のまま渡す。
    const rows = records.map((record, rowIndex) => {
        const rowNumber = rowIndex + 1;
        const cells = record.map((value, column) =>
            `<c r="${columns[column]}${rowNumber}" t="inlineStr"><is><t xml:space="preserve">${xlsxText(value)}</t></is></c>`,
        ).join('');
        return `<row r="${rowNumber}">${cells}</row>`;
    }).join('');

    return storeZip({
        '[Content_Types].xml': xmlHeader +
            `<Types xmlns="${packageNs}/content-types">` +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
            '</Types>',
        '_rels/.rels': xmlHeader +
            `<Relationships xmlns="${packageNs}/relationships">` +
            `<Relationship Id="rId1" Type="${relationNs}/officeDocument" Target="xl/workbook.xml"/>` +
            '</Relationships>',
        'xl/workbook.xml': xmlHeader +
            `<workbook xmlns="${sheetNs}" xmlns:r="${relationNs}">` +
            `<sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        'xl/_rels/workbook.xml.rels': xmlHeader +
            `<Relationships xmlns="${packageNs}/relationships">` +
            `<Relationship Id="rId1" Type="${relationNs}/worksheet" Target="worksheets/sheet1.xml"/>` +
            '</Relationships>',
        'xl/worksheets/sheet1.xml': xmlHeader +
            `<worksheet xmlns="${sheetNs}"><sheetData>${rows}</sheetData></worksheet>`,
    }, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/**
 * Calcで空白が失われないよう空白・改行・タブをODFの要素へ変換する。
 * @param {string} value セルの入力文字列。
 * @returns {string} text:pに入れるODFテキスト。
 */
function odsText(value) {
    return escapeXml(value).replace(/ +|\r\n|\r|\n|\t/g, whitespace => {
        if (whitespace === '\t') return '<text:tab/>';
        if (whitespace.startsWith(' ')) return `<text:s text:c="${whitespace.length}"/>`;
        return '<text:line-break/>';
    });
}

/**
 * @param {string[][]} records 見出しを含むセルの配列。
 * @returns {Blob} ODF 1.2のスプレッドシート。
 */
function odsFile(records) {
    const rows = records.map(record => {
        const cells = record.map(value =>
            `<table:table-cell office:value-type="string"><text:p>${odsText(value)}</text:p></table:table-cell>`,
        ).join('');
        return `<table:table-row>${cells}</table:table-row>`;
    }).join('');

    // ODFパッケージではmimetypeを無圧縮でZIPの先頭に置く。
    return storeZip({
        mimetype: odsMime,
        'content.xml': xmlHeader +
            `<office:document-content xmlns:office="${odfNs}office:1.0" xmlns:table="${odfNs}table:1.0" xmlns:text="${odfNs}text:1.0" office:version="1.2">` +
            '<office:body><office:spreadsheet>' +
            `<table:table table:name="${sheetName}">${rows}</table:table>` +
            '</office:spreadsheet></office:body></office:document-content>',
        'META-INF/manifest.xml': xmlHeader +
            `<manifest:manifest xmlns:manifest="${odfNs}manifest:1.0" manifest:version="1.2">` +
            `<manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="${odsMime}"/>` +
            '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
            '</manifest:manifest>',
    }, odsMime);
}

/**
 * @param {string[][]} records 見出しを含む、点検済みのセル。
 * @param {'xlsx'|'ods'} format 出力形式。
 * @returns {string} 出力を止める理由。出力できる場合は空文字。
 */
export function spreadsheetError(records, format) {
    if (format === 'xlsx' && records.some(record => record.some(value => value.length > excelCellLimit))) {
        return 'Excelで1セルに保存できる32,767文字の上限を超えています。';
    }
    if (format === 'ods' && records.some(record => record.some(value => /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(value)))) {
        return 'OpenOffice Calc形式のXMLに保存できない制御文字などが含まれています。';
    }
    return '';
}

/**
 * @param {string[][]} records 見出しを含む、点検済みのセル。
 * @param {'xlsx'|'ods'} format 出力形式。
 * @returns {Blob} ブラウザーから保存できるファイル。
 * @throws {Error} 指定形式で表を保存できない場合。
 */
export function createSpreadsheet(records, format) {
    const error = spreadsheetError(records, format);
    if (error) throw new Error(error);
    return format === 'xlsx' ? xlsxFile(records) : odsFile(records);
}
