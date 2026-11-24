/** @file YAMLをWorkerで処理し、画面用の結果だけを返す。 */
import { processYaml } from './yaml-tools-engine.js';

self.addEventListener('message', ({ data }) => {
    try {
        self.postMessage(processYaml(data));
    } catch (error) {
        self.postMessage({ error: error.message || '処理できませんでした。' });
    }
});
