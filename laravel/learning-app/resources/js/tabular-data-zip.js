/** @file 表計算ファイルに必要な小規模の無圧縮ZIPを組み立てる。 */

const encoder = new TextEncoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, byte) => {
    for (let bit = 0; bit < 8; bit++) {
        byte = (byte >>> 1) ^ (byte & 1 ? 0xedb88320 : 0);
    }
    return byte;
});

/**
 * @param {Uint8Array} bytes ZIPエントリーの内容。
 * @returns {number} ZIPのヘッダーに記録する符号なしCRC-32。
 */
function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
}

/**
 * @param {number} size ヘッダーの長さ（バイト）。
 * @param {number} signature ZIPで定められた32ビットの識別値。
 * @returns {DataView} リトルエンディアンで項目を記録するヘッダー。
 */
function zipHeader(size, signature) {
    const header = new DataView(new ArrayBuffer(size));
    header.setUint32(0, signature, true);
    return header;
}

/**
 * 既定のASCIIファイル名とUTF-8の内容を持つ無圧縮のZIPを生成する。
 * @param {Record<string, string>} entries 内部ファイル名と内容を記載順に並べたオブジェクト。
 * @param {string} mime ダウンロードファイルのMIME型。
 * @returns {Blob} ローカルヘッダー、内容、中央ディレクトリを連結したZIP。
 */
export function storeZip(entries, mime) {
    const files = [];
    const directory = [];
    let fileOffset = 0;
    let directorySize = 0;

    for (const [name, content] of Object.entries(entries)) {
        const filename = encoder.encode(name);
        const bytes = encoder.encode(content);
        const crc = crc32(bytes);

        // 内容を圧縮しないため、格納サイズと展開後サイズは等しい。
        const local = zipHeader(30, 0x04034b50);
        local.setUint16(4, 20, true);
        local.setUint16(12, 33, true); // DOS日付の最小値は1980-01-01。
        local.setUint32(14, crc, true);
        local.setUint32(18, bytes.length, true);
        local.setUint32(22, bytes.length, true);
        local.setUint16(26, filename.length, true);

        const central = zipHeader(46, 0x02014b50);
        central.setUint16(4, 20, true);
        central.setUint16(6, 20, true);
        central.setUint16(14, 33, true);
        central.setUint32(16, crc, true);
        central.setUint32(20, bytes.length, true);
        central.setUint32(24, bytes.length, true);
        central.setUint16(28, filename.length, true);
        central.setUint32(42, fileOffset, true);

        files.push(local.buffer, filename, bytes);
        directory.push(central.buffer, filename);
        fileOffset += local.byteLength + filename.length + bytes.length;
        directorySize += central.byteLength + filename.length;
    }

    const count = directory.length / 2;
    const end = zipHeader(22, 0x06054b50);
    end.setUint16(8, count, true);
    end.setUint16(10, count, true);
    end.setUint32(12, directorySize, true);
    end.setUint32(16, fileOffset, true);
    return new Blob([...files, ...directory, end.buffer], { type: mime });
}
