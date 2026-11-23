/** @file XLSXとODSを読み込み、プレビューとCSVに共通するセル値を決める。 */
import * as XLSX from 'xlsx';
import { unpackWorkbook } from './excel-to-csv-archive.js';
import { storeZip } from './tabular-data-zip.js';

export const sourceLimit = 5 * 1024 * 1024;
const sheetLimit = 20;
const rowLimit = 5000;
const columnLimit = 100;
const totalCellLimit = 250000;
const odf = 'urn:oasis:names:tc:opendocument:xmlns:';
const tableNs = odf + 'table:1.0';
const styleNs = odf + 'style:1.0';
const officeNs = odf + 'office:1.0';
const failed = 'ファイルを読み込めません。破損していないか確認して選び直してください。';
const invalidType = '.xlsx または .ods の表計算ファイルを選んでください。';

/**
 * @param {Uint8Array} bytes UTF-8のXML。
 * @returns {Document} パース済みのXML。外部参照やDTDを利用しない。
 * @throws {Error} XMLが不正な場合。
 */
function parseXml(bytes) {
    const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (/<!DOCTYPE/i.test(source)) throw new Error(failed);
    const doc = new DOMParser().parseFromString(source, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error(failed);
    return doc;
}

/**
 * @param {Record<string, Uint8Array>} entries ODSのZIP内ファイル。
 * @returns {{name: string, hidden: boolean, missingResults: string[]}[]} 元のシート名、非表示状態、未計算セル。
 * @throws {Error} ODSとして不正、または展開されたセル数が上限を超える場合。
 */
function odsMetadata(entries) {
    const content = parseXml(entries['content.xml']);
    const spreadsheet = content.getElementsByTagNameNS(officeNs, 'spreadsheet')[0];
    if (!spreadsheet) throw new Error(invalidType);
    const tables = [...spreadsheet.children].filter(el => el.namespaceURI === tableNs && el.localName === 'table');
    if (tables.length > sheetLimit) throw new Error(`シート数は最大${sheetLimit}枚です。`);
    const styles = new Map();
    const styleDocs = entries['styles.xml'] ? [parseXml(entries['styles.xml']), content] : [content];
    for (const doc of styleDocs) {
        for (const style of doc.getElementsByTagNameNS(styleNs, 'style')) {
            const prop = style.getElementsByTagNameNS(styleNs, 'table-properties')[0];
            if (prop?.hasAttributeNS(tableNs, 'display')) {
                styles.set(style.getAttributeNS(styleNs, 'name'), prop.getAttributeNS(tableNs, 'display') === 'false');
            }
        }
    }
    let total = 0;
    return tables.map(table => {
        const name = table.getAttributeNS(tableNs, 'name');
        const hidden = styles.get(table.getAttributeNS(tableNs, 'style-name')) === true ||
            table.getAttributeNS(tableNs, 'display') === 'false';
        const missingResults = [];
        let r = 0;
        for (const row of table.getElementsByTagNameNS(tableNs, 'table-row')) {
            const rowRepeat = Number(row.getAttributeNS(tableNs, 'number-rows-repeated') || 1);
            let c = 0;
            if (!Number.isSafeInteger(rowRepeat) || rowRepeat < 1) throw new Error(failed);
            for (const cell of row.children) {
                if (cell.namespaceURI !== tableNs || !['table-cell', 'covered-table-cell'].includes(cell.localName)) continue;
                const colRepeat = Number(cell.getAttributeNS(tableNs, 'number-columns-repeated') || 1);
                if (!Number.isSafeInteger(colRepeat) || colRepeat < 1) throw new Error(failed);
                const type = cell.getAttributeNS(officeNs, 'value-type');
                const formula = cell.hasAttributeNS(tableNs, 'formula');
                if (formula || (type && type !== 'void') || cell.textContent) total += rowRepeat * colRepeat;
                if (total > totalCellLimit) throw new Error('セルの総数が上限を超えています。');
                const valueAttribute = { float: 'value', currency: 'value', percentage: 'value', date: 'date-value', time: 'time-value', boolean: 'boolean-value' }[type];
                if (formula && (!type || type === 'void' || (valueAttribute && !cell.hasAttributeNS(officeNs, valueAttribute)))) {
                    missingResults.push(XLSX.utils.encode_cell({ r, c }));
                }
                c += colRepeat;
            }
            r += rowRepeat;
        }
        return { name, hidden, missingResults };
    });
}

/**
 * 展開したXMLから、ライブラリが空の数式結果を0などに置き換える前に確認する。
 * @param {Record<string, Uint8Array>} entries XLSX内のファイル。
 * @returns {Map<string, string>} 問題のあるXMLパスとセルアドレス。
 */
function xlsxMissingResults(entries) {
    const absent = new Map();
    let count = 0;
    for (const [name, data] of Object.entries(entries)) {
        if (!/^xl\/worksheets\/[^/]+\.xml$/.test(name)) continue;
        const xml = parseXml(data);
        for (const cell of xml.getElementsByTagNameNS('*', 'c')) {
            if (++count > totalCellLimit) throw new Error('セルの総数が上限を超えています。');
            const formula = cell.getElementsByTagNameNS('*', 'f')[0];
            const value = cell.getElementsByTagNameNS('*', 'v')[0];
            if (formula && (!value || (value.textContent === '' && cell.getAttribute('t') !== 'str')) && !absent.has(name)) {
                absent.set(name, cell.getAttribute('r'));
            }
        }
    }
    return absent;
}

/**
 * @param {object} cells SheetJSのシート。
 * @param {string} name 元のシート名。
 * @returns {{name: string, range: string, rows: {value: string, address: string}[][]}|null} 外周の空欄を省いた表。
 * @throws {Error} 範囲超過、保存済みの数式結果を読み込めない場合。
 */
function extractSheet(cells, name) {
    const box = { s: { r: Infinity, c: Infinity }, e: { r: -1, c: -1 } };
    const values = new Map();
    for (const [address, cell] of Object.entries(cells)) {
        if (!/^[A-Z]+[1-9]\d*$/.test(address)) continue;
        if (cell.f && cell.v === undefined) throw new Error(`${name}シートの${address}に保存済みの数式結果がありません。`);
        const value = cell.w ?? (cell.v === undefined || cell.v === null ? '' : XLSX.utils.format_cell(cell));
        if (value === '' && !cell.f) continue;
        const { r, c } = XLSX.utils.decode_cell(address);
        box.s.r = Math.min(box.s.r, r);
        box.s.c = Math.min(box.s.c, c);
        box.e.r = Math.max(box.e.r, r);
        box.e.c = Math.max(box.e.c, c);
        values.set(address, value);
    }
    if (!values.size) return null;
    const height = box.e.r - box.s.r + 1;
    const width = box.e.c - box.s.c + 1;
    if (height > rowLimit || width > columnLimit) throw new Error(`${name}シートが最大${rowLimit}行・${columnLimit}列の範囲を超えています。`);
    const rows = Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, column) => {
        const address = XLSX.utils.encode_cell({ r: box.s.r + row, c: box.s.c + column });
        return { value: values.get(address) ?? '', address };
    }));
    return { name, range: XLSX.utils.encode_range(box), rows };
}

/**
 * @param {File} file 選択されたXLSXまたはODS。最大5 MiB。
 * @returns {Promise<{sheets: object[], excluded: {name: string, reason: string}[]}>} 出力対象と除外理由。
 * @throws {Error} 対象外・破損・暗号化・上限超過など。
 */
export async function readWorkbook(file) {
    const extension = file.name.match(/\.(xlsx|ods)$/i)?.[1].toLowerCase();
    if (!extension) throw new Error(invalidType);
    if (file.size > sourceLimit) throw new Error('ファイルは最大5 MiBです。');
    const buffer = await file.arrayBuffer();
    const signature = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 8));
    if (extension === 'xlsx' && [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((byte, index) => byte === signature[index])) {
        throw new Error('暗号化された、または旧形式のExcelファイルは変換できません。');
    }
    const entries = await unpackWorkbook(buffer);
    const isOds = extension === 'ods';
    if (isOds ? !entries['content.xml'] || !entries.mimetype ||
        new TextDecoder().decode(entries.mimetype) !== 'application/vnd.oasis.opendocument.spreadsheet' :
        !entries['xl/workbook.xml'] || !entries['[Content_Types].xml']) throw new Error(invalidType);
    if (isOds && entries['META-INF/manifest.xml'] &&
        parseXml(entries['META-INF/manifest.xml']).getElementsByTagNameNS('*', 'encryption-data').length) {
        throw new Error('暗号化されたファイルは変換できません。');
    }
    if (!isOds && ![...parseXml(entries['[Content_Types].xml']).getElementsByTagNameNS('*', 'Override')]
        .some(el => el.getAttribute('PartName') === '/xl/workbook.xml' &&
            el.getAttribute('ContentType') === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml')) {
        throw new Error(invalidType);
    }
    const metadata = isOds ? odsMetadata(entries) : null;
    const missing = isOds ? null : xlsxMissingResults(entries);
    // 既存コンバーターのODSには別ファイルの書式定義がない。セルの値に触れず、空の定義を補う。
    if (isOds && !entries['styles.xml']) {
        entries['styles.xml'] = new TextEncoder().encode(`<office:document-styles xmlns:office="${officeNs}"><office:styles/></office:document-styles>`);
    }
    const book = XLSX.read(await storeZip(entries, 'application/zip').arrayBuffer(), { cellNF: true, sheetStubs: true, cellHTML: false });
    if (book.SheetNames.length > sheetLimit) throw new Error(`シート数は最大${sheetLimit}枚です。`);
    if (metadata && metadata.length !== book.SheetNames.length) throw new Error(failed);
    const workbookXml = isOds ? null : parseXml(entries['xl/workbook.xml']);
    const relationsXml = entries['xl/_rels/workbook.xml.rels'] ? parseXml(entries['xl/_rels/workbook.xml.rels']) : null;
    const targets = new Map(relationsXml ? Array.from(relationsXml.getElementsByTagNameNS('*', 'Relationship'), el =>
        [el.getAttribute('Id'), el.getAttribute('Target')]) : []);
    const workbookSheets = workbookXml ? [...workbookXml.getElementsByTagNameNS('*', 'sheet')] : [];
    const sheets = [];
    const excluded = [];
    let cells = 0;
    book.SheetNames.forEach((key, index) => {
        const meta = metadata?.[index];
        const name = meta?.name ?? key;
        if (meta?.hidden || book.Workbook?.Sheets?.[index]?.Hidden) {
            excluded.push({ name, reason: '非表示のシート' });
            return;
        }
        const id = [...(workbookSheets[index]?.attributes ?? [])].find(attribute => attribute.localName === 'id')?.value;
        const target = targets.get(id);
        const address = meta?.missingResults[0] ?? (target && missing?.get(target.startsWith('/') ? target.slice(1) : 'xl/' + target));
        if (address) throw new Error(`${name}シートの${address}に保存済みの数式結果がありません。`);
        const sheet = extractSheet(book.Sheets[key] ?? {}, name);
        if (!sheet) {
            excluded.push({ name, reason: 'データがないシート' });
            return;
        }
        cells += sheet.rows.length * sheet.rows[0].length;
        if (cells > totalCellLimit) throw new Error('出力するセルは全シートで最大250,000件です。');
        sheets.push(sheet);
    });
    return { sheets, excluded };
}
