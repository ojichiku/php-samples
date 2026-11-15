/**
 * @file UIから受けた処理条件を別スレッドで実行し、成功結果かエラー文をメッセージで返す。
 * 入力はtext-tools-engineのTextOptions、成功応答は{ok:true,result:TextResult}、失敗は{ok:false,error:string}。
 * UI側が1秒のタイマーでWorkerを終了させる。ここではDOM/外部通信/保存を行わない。
 */
import { processText } from './text-tools-engine.js';
self.onmessage = ({ data }) => {
    try { self.postMessage({ ok: true, result: processText(data) }); }
    catch (error) { self.postMessage({ ok: false, error: error.message || '処理できませんでした。' }); }
};
