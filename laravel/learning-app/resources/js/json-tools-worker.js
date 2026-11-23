/** @file JSONの処理を別スレッドで実行し、結果または表示用エラーを返す。 */
import { JsonToolError } from './json-tools-engine.js';
import { processJson } from './json-tools-process.js';

self.addEventListener('message', ({ data }) => {
    try {
        self.postMessage(processJson(data));
    } catch (error) {
        self.postMessage({ error: error instanceof JsonToolError ? error.message : '処理できませんでした。入力を確認してください。' });
    }
});
