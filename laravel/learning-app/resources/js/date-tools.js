/**
 * @file 日付・元号画面の入力、計算呼出し、結果表示とコピーを担当するブラウザー側の入口。
 * app.jsから読み込まれ、date-tools要素があるページだけ初期化する。
 * 計算条件と結果はメモリー上で保持し、pagehideで入力と結果を消す。
 */
import {validateYear, japanToday, dateLabel, eraSegments, westernToEra, eraToWestern, eraTable, daysBetween, shiftDays, ageAt} from './date-tools-engine.js';

const root = document.getElementById('date-tools');
if (root) {
    /**
     * @param {string} id 日付ツール内で検索する要素のID。
     * @returns {HTMLElement|null} IDに対応する要素。画面の固定IDを前提に使用する。
     */
    const $ = id => root.querySelector(`#${id}`);
    // パネルIDごとに、正常に計算した最新のコピー用文字列を保持する。
    const results = new Map();
    /**
     * @param {number} year 換算対象の西暦年（単位：年）。
     * @returns {string} 日本時間の現在年より未来なら注意文、そうでなければ空文字。
     */
    const futureNote = year => year > Number(japanToday().slice(0, 4)) ? '\n※未来年は、現在の令和が続く場合の換算です。' : '';
    /**
     * @param {string} date 検証済みの日付（YYYY-MM-DD）。
     * @returns {string} 元号期間の表示に使う月日（例：05月01日）。
     */
    const shortDate = date => date.slice(5).replace('-', '月') + '日';
    // 入力/結果が更新されるたびに進め、遅れて完了したコピー処理の画面更新を無効にする。
    let generation = 0;
    /**
     * 入力変更後に古い結果・コピー用文字列と案内を消す。表なら行も破棄する。
     * @param {string} panel western/japanese/table/dates/ageのパネルID。
     * @returns {void}
     */
    function invalidate(panel) {
        generation++;
        results.delete(panel);
        $(`${panel}-result`).textContent = '入力に合わせて、ボタンを押して結果を確認してください。';
        $(`${panel}-result`).className = 'result placeholder';
        root.querySelector(`[data-copy="${panel}"]`).hidden = true;
        $(`${panel}-copy-status`).textContent = '';
        $(`${panel}-copy-fallback`).hidden = true;
        $(`${panel}-copy-fallback`).value = '';
        if (panel === 'table') {
            $('era-table-wrap').hidden = true;
            $('era-table-body').replaceChildren();
        }
    }
    /**
     * 計算結果またはエラーを表示し、コピー可能な状態を切り替える。
     * @param {string} panel 表示先のパネルID。
     * @param {string} text 計算結果または検証エラーの表示文。
     * @param {boolean} [error=false] trueならコピーを隠し、以前のコピー用文字列を破棄する。
     * @returns {void}
     */
    function show(panel, text, error = false) {
        generation++;
        $(`${panel}-result`).textContent = text;
        $(`${panel}-result`).className = error ? 'result error' : 'result';
        root.querySelector(`[data-copy="${panel}"]`).hidden = error;
        $(`${panel}-copy-status`).textContent = '';
        $(`${panel}-copy-fallback`).hidden = true;
        $(`${panel}-copy-fallback`).value = '';
        if (error) {
            results.delete(panel);
            if (panel === 'table') $('era-table-wrap').hidden = true;
        } else results.set(panel, text);
    }
    const handlers = {
        /**
         * 西暦の年または年月日を読み、該当する元号と期間を表示する。
         * @returns {void}
         * @throws {Error} 計算エンジンが入力を拒否した場合。submitハンドラーで受け取り画面に表示する。
         */
        western() {
            if ($('western-mode').value === 'year') {
                const year = validateYear($('western-year').value);
                const text = eraSegments(year).map(item => `${item.label}（${shortDate(item.start)}〜${shortDate(item.end)}）`).join('\n');
                show('western', `${year}年\n${text}${futureNote(year)}`);
            } else {
                const date = $('western-date').value;
                show('western', `${dateLabel(date)}\n${westernToEra(date)}${futureNote(Number(date.slice(0, 4)))}`);
            }
        },
        /**
         * 元号・年と任意の月日を読み、西暦への換算結果を表示する。
         * @returns {void}
         * @throws {Error} 計算エンジンが入力を拒否した場合。submitハンドラーで受け取り画面に表示する。
         */
        japanese() {
            const name = $('era-name').value, year = $('era-year').value;
            if ($('era-mode').value === 'year') {
                const result = eraToWestern(name, year);
                show('japanese', `${result.label} → ${result.year}年\n対応する期間：${dateLabel(result.start)}〜${dateLabel(result.end)}${futureNote(result.year)}`);
            } else {
                const result = eraToWestern(name, year, $('era-month').value, $('era-day').value);
                show('japanese', `${westernToEra(result.date)}\n${dateLabel(result.date)}${futureNote(result.year)}`);
            }
        },
        /**
         * 年の範囲を読み、元号対応表のDOMとタブ区切りのコピー用文字列を作る。
         * @returns {void}
         * @throws {Error} 計算エンジンが入力を拒否した場合。submitハンドラーで受け取り画面に表示する。
         */
        table() {
            const rows = eraTable($('table-start').value, $('table-end').value), body = $('era-table-body');
            body.replaceChildren();
            const text = ['西暦\t元号・期間'];
            for (const {year, segments} of rows) {
                const label = segments.map(item => segments.length === 1 ? item.label : `${item.label}（${shortDate(item.start)}〜${shortDate(item.end)}）`).join('／');
                const row = document.createElement('tr'), first = document.createElement('th'), second = document.createElement('td');
                first.scope = 'row'; first.textContent = `${year}年`; second.textContent = label;
                row.append(first, second); body.append(row);
                text.push(`${year}年\t${label}`);
            }
            const first = rows[0].year, last = rows.at(-1).year;
            show('table', `${first}〜${last}年の${rows.length}年分を表示しました。${futureNote(last)}`);
            results.set('table', text.join('\n') + futureNote(last));
            $('era-table-wrap').hidden = false;
        },
        /**
         * 日付差または前後の日付を計算し、開始日を含める選択と共に表示する。
         * @returns {void}
         * @throws {Error} 計算エンジンが入力を拒否した場合。submitハンドラーで受け取り画面に表示する。
         */
        dates() {
            const start = $('date-start').value;
            if ($('date-operation').value === 'diff') {
                const end = $('date-end').value, include = $('include-start').checked;
                const days = daysBetween(start, end, include);
                show('dates', `${days.toLocaleString('ja-JP')}日\n${dateLabel(start)}〜${dateLabel(end)}\n開始日を${include ? '含める' : '含めない'}`);
            } else {
                const direction = $('day-direction').value === '1' ? 'after' : 'before';
                const end = shiftDays(start, $('day-count').value, direction);
                show('dates', `${dateLabel(start)}の${Number($('day-count').value).toLocaleString('ja-JP')}日${direction === 'after' ? '後' : '前'}\n${dateLabel(end)}`);
            }
        },
        /**
         * 誕生日・基準日・うるう日の方針から満年齢を計算して表示する。
         * @returns {void}
         * @throws {Error} 計算エンジンが入力を拒否した場合。submitハンドラーで受け取り画面に表示する。
         */
        age() {
            const birth = $('birth-date').value, reference = $('age-reference').value, policy = $('leap-policy').value;
            const age = ageAt(birth, reference, policy);
            const note = birth.endsWith('-02-29') ? `\n平年の誕生日は${policy === 'march' ? '3月1日' : '2月28日'}として計算` : '';
            show('age', `満${age}歳\n誕生日：${dateLabel(birth)}\n基準日：${dateLabel(reference)}${note}`);
        },
    };
    /**
     * 年だけ/年月日、日付差/日付移動の選択に合わせて入力欄とラベルを切り替える。
     * @returns {void}
     */
    function updateControls() {
        const yearOnly = $('western-mode').value === 'year';
        $('western-date-field').hidden = yearOnly;
        $('western-year-field').hidden = !yearOnly;
        $('era-month-day').hidden = $('era-mode').value === 'year';
        const difference = $('date-operation').value === 'diff';
        $('diff-fields').hidden = !difference;
        $('add-fields').hidden = difference;
        $('date-start-label').textContent = difference ? '開始日' : '基準日';
    }
    // 機能ボタンで表示パネルとaria-pressedを更新する。入力値は切替時に保持する。
    root.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => {
        root.querySelectorAll('[data-panel]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        root.querySelectorAll('section').forEach(panel => panel.hidden = panel.id !== button.dataset.panel);
    }));
    // 通常のフォーム送信を止め、各パネルの計算エラーを結果欄へ表示する。
    root.querySelectorAll('[data-form]').forEach(form => {
        form.addEventListener('submit', event => {
            event.preventDefault();
            try { handlers[form.dataset.form](); }
            catch (error) { show(form.dataset.form, error.message, true); }
        });
        for (const event of ['input', 'change']) form.addEventListener(event, () => { updateControls(); invalidate(form.dataset.form); });
    });
    // 入力を消す操作では選択欄は保持し、入力値と対応する古い結果を消す。
    root.querySelectorAll('[data-clear]').forEach(button => button.addEventListener('click', () => {
        const panel = button.dataset.clear;
        root.querySelector(`[data-form="${panel}"]`).querySelectorAll('input').forEach(input => {
            if (input.type === 'checkbox') input.checked = false;
            else input.value = '';
        });
        invalidate(panel);
    }));
    // コピーは非同期。失敗時は選択可能な欄を出し、入力更新後なら古い完了通知を出さない。
    root.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
        const panel = button.dataset.copy, text = results.get(panel), token = generation;
        if (!text) return;
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(text);
            if (generation === token) $(`${panel}-copy-status`).textContent = 'コピーしました。';
        } catch {
            if (generation !== token) return;
            const fallback = $(`${panel}-copy-fallback`);
            fallback.hidden = false; fallback.value = text; fallback.focus(); fallback.select();
            $(`${panel}-copy-status`).textContent = 'コピーできませんでした。表示された結果を選択してコピーしてください。';
        }
    }));
    // 日本時間の今年を中心に範囲を補い、対応範囲1873〜2100年の外へ出さない。
    $('table-near-today').addEventListener('click', () => {
        const year = Number(japanToday().slice(0, 4));
        $('table-start').value = Math.max(1873, Math.min(2100, year - 10));
        $('table-end').value = Math.min(2100, Math.max(1873, year + 10));
        invalidate('table');
    });
    // 「今日」は端末のタイムゾーンではなく日本時間で補う。
    $('age-today').addEventListener('click', () => { $('age-reference').value = japanToday(); invalidate('age'); });
    $('age-reference').value = japanToday();
    updateControls();
    // 初期化後に入力を有効にする。JS不在時はBladeのdisabledが残る。
    root.querySelectorAll('[data-date-inputs]').forEach(fieldset => fieldset.disabled = false);
    // 離脱や履歴キャッシュへの退避時に入力と結果を消し、コピーの遅い応答も無効にする。
    window.addEventListener('pagehide', () => {
        root.querySelectorAll('input').forEach(input => {
            if (input.type === 'checkbox') input.checked = false;
            else input.value = '';
        });
        Object.keys(handlers).forEach(invalidate);
    });
}
