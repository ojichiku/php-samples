/** @file CSV・TSVを文字列セルとして読み込み、行番号と検査結果を返す。 */

export const dataRowLimit = 5000;
export const columnLimit = 100;
export const inputByteLimit = 5 * 1024 * 1024;
export const previewRowLimit = 100;

/**
 * 選択した文字コードで入力ファイルを読む。
 * @param {File} file 読み込むローカルファイル。
 * @param {'utf8'|'cp932'} encoding 手動で選択した文字コード。
 * @returns {Promise<string>} BOMを除いた入力テキスト。
 * @throws {Error} 容量超過、ファイルの読み取り失敗、文字コードの不一致。
 */
export async function readTabularFile(file, encoding) {
    if (file.size > inputByteLimit) {
        throw new Error('入力ファイルが5 MiBの上限を超えています。');
    }

    let bytes;
    try {
        bytes = await file.arrayBuffer();
    } catch {
        throw new Error('ファイルを読み込めませんでした。ファイルを選び直してください。');
    }

    try {
        return new TextDecoder(encoding === 'cp932' ? 'shift_jis' : 'utf-8', { fatal: true }).decode(bytes);
    } catch {
        const hint = encoding === 'utf8'
            ? 'UTF-8として読み込めません。Windows向けのCSVの場合はShift_JIS（CP932）を選んで再チェックしてください。'
            : 'Shift_JIS（CP932）として読み込めません。文字コードを確認して再チェックしてください。';
        throw new Error(hint);
    }
}

/**
 * @typedef {Object} InputCheck
 * @property {string[][]} records 見出しを含む、列数が合ったレコード。
 * @property {string[]} errors 変換を止める理由。
 * @property {number} dataRows 見出しを除く読み取り済みレコード数。
 * @property {number} emptyCells データ内の空欄セル数。
 * @property {number} leadingZeroCells データ内で先頭にゼロを含む数値風のセル数。
 */

/**
 * 区切り文字と引用符の規則に従って全レコードを点検する。
 * @param {string} source デコード済みのテキスト。
 * @param {','|'\t'} delimiter 列を区切る文字。
 * @param {boolean} useQuotes ダブルクォートを引用符として扱うか。
 * @returns {InputCheck} 読み取れたレコード、件数、変換を妨げるエラー。
 */
export function checkTabularData(source, delimiter, useQuotes) {
    const result = { records: [], errors: [], dataRows: 0, emptyCells: 0, leadingZeroCells: 0 };
    if (source.length === 0) {
        result.errors.push('ファイルが空です。見出しがあるCSV・TSVを選んでください。');
        return result;
    }

    let line = 1;
    let recordLine = 1;
    let columns = [];
    let value = '';
    let state = 'start';

    /**
     * 現在のセルを確定する。
     * @returns {void}
     */
    function closeCell() {
        columns.push(value);
        value = '';
        state = 'start';
    }

    /**
     * 見出しと列数を照合し、データ行の件数を更新する。
     * @returns {boolean} 残りの入力を読み進められる場合はtrue。
     */
    function closeRecord() {
        closeCell();
        if (result.records.length === 0) {
            result.records.push(columns);
            return true;
        }

        if (++result.dataRows > dataRowLimit) {
            result.errors.push('5,000データ行の上限を超えています。5,001件目で読み込みを停止しました。');
            return false;
        }

        const expectedColumns = result.records[0].length;
        if (columns.length !== expectedColumns) {
            result.errors.push(`${recordLine}行目は${expectedColumns}列必要ですが、${columns.length}列です。`);
            return true;
        }

        result.records.push(columns);
        for (const cell of columns) {
            if (cell === '') result.emptyCells += 1;
            if (/^0\d/.test(cell)) result.leadingZeroCells += 1;
        }
        return true;
    }

    for (let index = 0; index < source.length; index++) {
        const character = source[index];
        const isNewline = character === '\n' || character === '\r';
        const isCrlf = character === '\r' && source[index + 1] === '\n';

        // 引用符内の改行は物理行だけを進め、改行コードもセル値として保持する。
        if (state === 'quoted') {
            if (character === '"' && source[index + 1] === '"') {
                value += '"';
                index += 1;
            } else if (character === '"') {
                state = 'closed';
            } else {
                value += isCrlf ? '\r\n' : character;
                if (isNewline) line += 1;
                if (isCrlf) index += 1;
            }
        } else if (character === delimiter) {
            closeCell();
            if (columns.length === columnLimit) {
                result.errors.push(`${recordLine}行目は${columnLimit}列の上限を超えています。`);
                return result;
            }
        } else if (isNewline) {
            if (!closeRecord()) return result;
            columns = [];
            if (isCrlf) index += 1;
            line += 1;
            recordLine = line;
        } else if (useQuotes && character === '"' && state === 'start') {
            state = 'quoted';
        } else if (state === 'closed' || (useQuotes && character === '"')) {
            result.errors.push(`${recordLine}行目のダブルクォートの位置を確認してください。`);
            return result;
        } else {
            value += character;
            state = 'unquoted';
        }
    }

    if (state === 'quoted') {
        result.errors.push(`${recordLine}行目で始まったレコードのダブルクォートが閉じていません。`);
    } else if (columns.length > 0 || state !== 'start') {
        closeRecord();
    }
    return result;
}
