import { processText } from './text-tools-engine.js';
self.onmessage = ({ data }) => {
    try { self.postMessage({ ok: true, result: processText(data) }); }
    catch (error) { self.postMessage({ ok: false, error: error.message || '処理できませんでした。' }); }
};
