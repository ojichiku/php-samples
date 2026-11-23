/** @file 展開量を制限して表計算ファイルを読み込む。 */

import { crc32 } from './tabular-data-zip.js';

const expandedLimit = 32 * 1024 * 1024;
const maxEntries = 1000;
const invalidZip = 'ファイルの内部構造を読み込めません。';
const expandedError = '展開後のファイルが32 MiBの上限を超えています。';

/**
 * ZIPの末尾から中央ディレクトリの位置と件数を取得する。
 * @param {DataView} data ファイル全体。
 * @returns {{offset: number, end: number, count: number}} 中央ディレクトリの範囲と件数。
 * @throws {Error} ZIP構造が不正またはZIP64の場合。
 */
function directoryLocation(data) {
    for (let end = data.byteLength - 22; end >= Math.max(0, data.byteLength - 65557); end--) {
        if (data.getUint32(end, true) !== 0x06054b50 || end + 22 + data.getUint16(end + 20, true) !== data.byteLength) continue;
        const offset = data.getUint32(end + 16, true);
        const count = data.getUint16(end + 10, true);
        if (data.getUint32(end + 4, true) !== 0 || data.getUint16(end + 8, true) !== count ||
            offset + data.getUint32(end + 12, true) !== end || count === 0 || count > maxEntries) break;
        return { offset, end, count };
    }
    throw new Error(invalidZip);
}

/**
 * @param {Uint8Array} bytes 圧縮済みの1エントリー。
 * @param {number} size 記録されている展開後容量（バイト）。
 * @returns {Promise<Uint8Array>} 実際の展開後容量を確認した内容。
 * @throws {Error} 展開できない場合または記録と実容量が一致しない場合。
 */
async function inflate(bytes, size) {
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const result = new Uint8Array(size);
    let cursor = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (cursor + value.length > size) throw new Error(expandedError);
            result.set(value, cursor);
            cursor += value.length;
        }
    } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
    }
    if (cursor !== size) throw new Error(invalidZip);
    return result;
}

/**
 * @param {ArrayBuffer} buffer XLSXまたはODSのZIPコンテナー。
 * @returns {Promise<Record<string, Uint8Array>>} ファイル名ごとの展開済みバイト列。
 * @throws {Error} 破損、暗号化、上限超過、または未対応の圧縮方式。
 */
export async function unpackWorkbook(buffer) {
    const data = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const { offset, end, count } = directoryLocation(data);
    const entries = Object.create(null);
    let total = 0;
    let cursor = offset;
    for (let index = 0; index < count; index++) {
        if (cursor + 46 > end || data.getUint32(cursor, true) !== 0x02014b50) throw new Error(invalidZip);
        const flags = data.getUint16(cursor + 8, true);
        const method = data.getUint16(cursor + 10, true);
        const checksum = data.getUint32(cursor + 16, true);
        const compressed = data.getUint32(cursor + 20, true);
        const size = data.getUint32(cursor + 24, true);
        const nameEnd = cursor + 46 + data.getUint16(cursor + 28, true);
        const next = nameEnd + data.getUint16(cursor + 30, true) + data.getUint16(cursor + 32, true);
        const local = data.getUint32(cursor + 42, true);
        if (next > end || local + 30 > offset || data.getUint32(local, true) !== 0x04034b50 ||
            data.getUint16(cursor + 34, true) !== 0) throw new Error(invalidZip);
        if ((flags | data.getUint16(local + 6, true)) & 1) throw new Error('暗号化されたファイルは変換できません。');
        const name = decoder.decode(bytes.subarray(cursor + 46, nameEnd));
        const start = local + 30 + data.getUint16(local + 26, true) + data.getUint16(local + 28, true);
        if (!name || name.includes('\\') || name.startsWith('/') || name.split('/').includes('..') ||
            Object.hasOwn(entries, name) || start + compressed > offset) throw new Error(invalidZip);
        total += size;
        if (total > expandedLimit) throw new Error(expandedError);
        const content = bytes.subarray(start, start + compressed);
        if (method === 0 && size === compressed) entries[name] = content;
        else if (method === 8) entries[name] = await inflate(content, size);
        else throw new Error(invalidZip);
        if (crc32(entries[name]) !== checksum) throw new Error(invalidZip);
        cursor = next;
    }
    if (cursor !== end) throw new Error(invalidZip);
    return entries;
}
