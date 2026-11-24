/** @file 入力形式と操作に応じてブラウザー処理を実行する。 */
import { convertJsonToCsv, formatJsonl, JsonToolError, limitOutput, parseJson, writeJson } from './json-tools-engine.js';
import { compileSchema, generateSchema, validateAgainstSchema } from './json-schema-tools.js';

const indentation = new Map([['2', '  '], ['4', '    '], ['tab', '\t']]);

/**
 * JSON入力を読み、エラー時は照合のどちらの欄か示す。
 * @param {string} input 入力原文。
 * @param {string} label 入力欄名。
 * @returns {ReturnType<typeof parseJson>} 構文木と警告。
 * @throws {JsonToolError} 構文・入力上限の違反。
 */
function read(input, label) {
    try {
        return parseJson(input);
    } catch (error) {
        if (!(error instanceof JsonToolError)) throw error;
        throw new JsonToolError(label + '：' + error.message);
    }
}

/**
 * 承認済みの処理を選択し、表示・保存用の値を返す。
 * @param {{format: string, operation: string, input: string, schema: string, indentStyle?: '2'|'4'|'tab'}} request 形式、処理、入力原文、照合スキーマ、整形時の字下げ。
 * @returns {{message: string, warning?: string, note?: string, output?: string, suffix?: string, preview?: string[][], invalid?: boolean}} 表示データ。
 * @throws {JsonToolError} 構文や変換条件の違反。
 */
export function processJson({ format, operation, input, schema, indentStyle }) {
    if (format === 'jsonl') {
        return { ...formatJsonl(input), message: 'JSONLを整形しました。', suffix: '-formatted.jsonl' };
    }
    const { root, warning } = read(input, format === 'schema' ? 'JSON Schema' : 'JSON入力');

    if (operation === 'check') return { message: 'JSONの構文は正しいです。', warning };
    if (operation === 'format' || operation === 'minify') {
        const pretty = operation === 'format';
        const suffix = format === 'schema' ? '.schema.json' : pretty ? '-formatted.json' : '-minified.json';
        return { output: writeJson(root, pretty, indentation.get(indentStyle)), message: pretty ? '整形しました。' : '圧縮しました。', warning, suffix };
    }
    if (warning) throw new JsonToolError(warning + ' 重複を解消してから実行してください。');
    if (operation === 'csv') {
        const { output, preview, rowCount } = convertJsonToCsv(root);
        return {
            output, preview, suffix: '.csv',
            message: `CSVに変換しました。全${rowCount}件${rowCount > 100 ? '（表示は先頭100件）' : ''}。`,
            note: '先頭にゼロがある列は、表計算ソフトに文字列として取り込んでください。',
        };
    }
    if (operation === 'generate') {
        return {
            output: limitOutput(generateSchema(root)),
            suffix: '.schema.json',
            message: 'スキーマのひな形を生成しました。',
            note: '実際のルールに合わせて見直してください。',
        };
    }
    if (operation === 'schema-check') {
        compileSchema(root);
        return { message: 'Draft 2020-12のスキーマ定義を確認しました。' };
    }
    if (operation === 'validate') {
        const schemaDocument = read(schema, 'JSON Schema');
        if (schemaDocument.warning) throw new JsonToolError('JSON Schema：' + schemaDocument.warning);
        return validateAgainstSchema(root, schemaDocument.root);
    }
    throw new JsonToolError('処理を選び直してください。');
}
