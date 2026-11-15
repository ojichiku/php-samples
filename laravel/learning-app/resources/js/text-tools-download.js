/** @file 結果テキストをブラウザーのダウンロードへ渡す。サーバーには送らない。 */
// ダウンロード開始前にURLを解放しないよう最大60秒保持し、離脱時にも解放する。
const pending = new Map();

/**
 * UTF-8/BOMなしのテキストBlobを作り、保存をブラウザーへ依頼する。
 *
 * @param {string} text 保存する結果テキスト。改行形式は呼出し元の値を使う。
 * @param {string} [filename="text-result.txt"] 保存時のファイル名候補。実際の保存先/名前はブラウザーや利用者が決める。
 * @returns {void} 保存開始操作を行う。保存完了を確認する戻り値はない。
 * @throws {Error} Blob/URL/リンク作成やクリックが失敗した場合。
 */
export function downloadText(text, filename = 'text-result.txt') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    /** 一時URLとタイマーを解放する。
     * @returns {void}
     */
    const release = () => { URL.revokeObjectURL(url); clearTimeout(pending.get(url)); pending.delete(url); };
    try {
        link.href = url;
        link.download = filename;
        link.hidden = true;
        document.body.append(link);
        link.click();
        pending.set(url, setTimeout(release, 60_000));
    } catch (error) {
        release();
        throw error;
    } finally {
        link.remove();
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
        for (const [url, timer] of pending) { clearTimeout(timer); URL.revokeObjectURL(url); }
        pending.clear();
    });
}
