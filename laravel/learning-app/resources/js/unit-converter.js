/**
 * @file 単位換算画面の分類/入力/結果表示。app.jsから読み込み、該当画面だけ初期化する。
 */
import { UNIT_GROUPS, convertUnits, referenceRelation } from './unit-converter-engine.js';

const root = document.getElementById('unit-converter');
if (root) {
    /**
     * 画面内の固定IDを検索する。
     *
     * @param {string} id 要素ID。
     * @returns {HTMLElement|null} 対応する要素。
     */
    const $ = id => root.querySelector(`#${id}`);
    let active = 'length';
    // 結果更新の世代番号。遅れて完了したコピーが新しい入力へ案内を出すのを防ぐ。
    let generation = 0;
    let copyText = '';
    /**
     * 入力変更時に結果とコピー状態を消し、未完了のコピー応答も無効にする。
     *
     * @returns {void}
     */
    function clearResult() {
        generation++;
        copyText = '';
        $('converted').value = '';
        $('result').className = '';
        $('result').textContent = '数値と単位を選んで「換算」を押してください。';
        $('result-note').textContent = '';
        $('copy').disabled = true;
        $('copy-status').textContent = '';
        $('copy-fallback').hidden = true;
        $('fallback').value = '';
    }
    /**
     * 分類ボタン・単位候補・早見表を更新し、入力と結果を初期化する。
     *
     * @param {string} category UNIT_GROUPSの分類キー。
     * @returns {void}
     */
    function selectGroup(category) {
        active = category;
        const group = UNIT_GROUPS[category];
        for (const button of root.querySelectorAll('[data-group]')) {
            button.setAttribute('aria-pressed', String(button.dataset.group === category));
        }
        $('hint').textContent = group.hint;
        $('table-heading').textContent = `${group.name}の早見表`;
        for (const select of [$('from'), $('to')]) {
            select.replaceChildren(...group.units.map(unit => new Option(`${unit.name}（${unit.symbol}）`, unit.id)));
        }
        $('to').selectedIndex = 1;
        $('value').value = '';
        clearResult();
        $('rows').replaceChildren(...group.units.map(unit => {
            const row = document.createElement('tr');
            for (const text of [unit.name, unit.symbol, referenceRelation(category, unit)]) {
                const cell = document.createElement('td');
                cell.textContent = text;
                row.append(cell);
            }
            return row;
        }));
        $('table-note').textContent = category === 'temperature'
            ? '代表値：0 °C = 32 °F = 273.15 K。記号を式の数値として読むための早見式です。'
            : `${group.hint} 表示は最大12桁の有効数字。≈は丸めた値です。`;
    }
    // BigIntが使えなければ入力を無効のまま残し、未対応の案内を出す。
    if (typeof BigInt !== 'function') {
        document.getElementById('unit-unsupported').hidden = false;
    } else {
        for (const [category, group] of Object.entries(UNIT_GROUPS)) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = group.name;
            button.dataset.group = category;
            button.setAttribute('aria-controls', 'workspace reference');
            button.addEventListener('click', () => selectGroup(category));
            $('categories').append(button);
        }
        // 通常のフォーム送信を止め、ブラウザー内で計算し、例外を結果欄へ表示する。
        $('form').addEventListener('submit', event => {
            event.preventDefault();
            clearResult();
            try {
                const raw = $('value').value.trim();
                const result = convertUnits(active, $('from').value, $('to').value, raw);
                $('converted').value = `${result.rounded ? '≈ ' : ''}${result.text}`;
                copyText = `${$('converted').value} ${result.to.symbol}`;
                $('result').className = 'sr-only';
                $('result').textContent = copyText;
                $('result-note').textContent = `${raw} ${result.from.symbol} → ${result.to.name}`
                    + (result.rounded ? '。有効数字12桁で四捨五入しています。' : '');
                $('copy').disabled = false;
            } catch (error) {
                $('result').textContent = error.message;
            }
        });
        for (const id of ['value', 'from', 'to']) {
            $(id).addEventListener(id === 'value' ? 'input' : 'change', clearResult);
        }
        // 単位だけを交換し、数値は維持する。換算結果は再計算まで消す。
        $('swap').addEventListener('click', () => {
            const from = $('from').value;
            $('from').value = $('to').value;
            $('to').value = from;
            clearResult();
        });
        $('reset').addEventListener('click', () => {
            $('value').value = '';
            clearResult();
            $('value').focus();
        });
        // コピー失敗時は手動選択へ切り替える。結果が変わった後の完了/失敗は画面へ反映しない。
        $('copy').addEventListener('click', async () => {
            const text = copyText, token = generation;
            if (!text) return;
            try {
                if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
                await navigator.clipboard.writeText(text);
                if (generation === token) $('copy-status').textContent = 'コピーしました。';
            } catch {
                if (generation !== token) return;
                $('fallback').value = text;
                $('copy-fallback').hidden = false;
                $('copy-status').textContent = '下の結果を選択してコピーしてください。';
                $('fallback').focus();
                $('fallback').select();
            }
        });
        selectGroup('length');
        $('unit-inputs').disabled = false;
        // 画面離脱時は初期分類へ戻して入力と結果を消す。
        window.addEventListener('pagehide', () => selectGroup('length'));
    }
}
