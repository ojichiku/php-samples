/**
 * @file 日常計算のGET画面を操作する。入力は保存/送信せず、10進数を整数比で計算する。
 */
import { parseDecimal, rounded } from './calculation-tools-engine.js';
import '../css/calculation-tools.css';

(() => {
'use strict';
const modes = ['ratio', 'discount', 'change', 'split'];
/** @typedef {{n: bigint, d: bigint, text: string}} DecimalValue 10進入力の整数分子、正の分母、表示文字列。 */
/**
 * 固定IDの要素を返す。
 * @param {string} id HTMLに存在するID。
 * @returns {HTMLElement} 対象要素。
 */
const el = id => document.getElementById(id);
/**
 * 入力欄の値を整数比へ変換する。
 * @param {string} id 入力欄ID。
 * @param {string} label エラー用の項目名。
 * @param {number} digits 許容小数桁数。既定4桁。
 * @param {bigint} max 整数上限。既定999999999。
 * @param {boolean} positive 0を禁止する場合true。既定false。
 * @returns {{n: bigint, d: bigint, text: string}} 検証済み整数比と表示文字列。
 * @throws {Error} 形式、上限、桁数または0禁止に違反した場合。
 */
function read(id, label, digits = 4, max = 999999999n, positive = false) {
    return parseDecimal(el(id).value, id, label, digits, max, positive);
}
/**
 * 結果を安全なテキスト要素で表示する。
 * @param {string} mode 対象用途のID接頭辞。
 * @param {string} title 結果の説明。
 * @param {string} value 主となる結果。
 * @param {string[]} details 補足と式。
 * @returns {void}
 */
function show(mode, title, value, details) {
    const box = el(`${mode}-result`); box.replaceChildren();
    for (const [index, text] of [title, value, ...details].entries()) {
        const p = document.createElement('p'); p.textContent = text;
        if (index === 1) p.className = 'value'; else if (index >= 2) p.className = 'formula';
        box.append(p);
    }
    box.hidden = false;
}
/**
 * 入力変更後に旧結果・エラーを消し、再入力した値を保持する。
 * @param {string} mode 対象用途。
 * @returns {void}
 */
function invalidate(mode) {
    el(`${mode}-result`).hidden = true; el(`${mode}-error`).textContent = '';
    el(`${mode}-form`).querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
}
/**
 * 選択した用途のみ表示し、タブのキーボード移動順を更新する。
 * @param {string} active 表示する用途。
 * @returns {void}
 */
function activate(active) {
    for (const mode of modes) {
        el(`${mode}-panel`).hidden = mode !== active;
        el(`${mode}-tab`).setAttribute('aria-selected', String(mode === active));
        el(`${mode}-tab`).tabIndex = mode === active ? 0 : -1;
    }
}
/**
 * 用途に応じた計算と表示を行う。金額は整数で扱い、割引の切捨て位置を明示する。
 * @param {string} mode 実行する用途。
 * @returns {void}
 * @throws {Error} readが検出した不正入力。フォーム送信側で表示する。
 */
function calculate(mode) {
    if (mode === 'ratio') {
        const percent = el('ratio-kind').value === 'percent';
        const whole = read('ratio-whole', '全体の値', 4, 999999999n, percent);
        const part = read('ratio-part', percent ? '一部の値' : '割合', 4, percent ? 999999999n : 1000000n);
        const n = percent ? part.n * whole.d * 100n : whole.n * part.n;
        const d = percent ? part.d * whole.n : whole.d * part.d * 100n;
        show(mode, percent ? '全体に対する割合' : '割合から求めた値', `${rounded(n, d)}${percent ? '%' : ''}`, [percent ? `${part.text} ÷ ${whole.text} × 100（全体${whole.text}が基準）` : `${whole.text} × ${part.text} ÷ 100`, '小数4桁で四捨五入。丸めた結果には「約」を付けています。']);
    } else if (mode === 'discount') {
        const price = read('discount-price', '元の金額', 0), rate = read('discount-rate', '割引率', 2, 100n);
        const discount = price.n * rate.n / (rate.d * 100n), pay = price.n - discount;
        show(mode, '割引後の支払額', `${pay.toLocaleString('ja-JP')}円`, [`割引額：${discount.toLocaleString('ja-JP')}円`, `${price.n.toLocaleString('ja-JP')}円 − ${discount.toLocaleString('ja-JP')}円 ＝ ${pay.toLocaleString('ja-JP')}円`, `元の金額 × ${rate.text}% の1円未満を切捨てて割引額にしています。`]);
    } else if (mode === 'change') {
        const before = read('change-before', '変更前の値', 4, 999999999n, true), after = read('change-after', '変更後の値');
        const difference = after.n * before.d - before.n * after.d;
        const magnitude = difference < 0n ? -difference : difference;
        show(mode, '変更前を基準にした増減率', `${rounded(magnitude * 100n, after.d * before.n)}%${difference > 0n ? ' 増' : difference < 0n ? ' 減' : '（増減なし）'}`, [`(${after.text} − ${before.text}) ÷ ${before.text} × 100`, '小数4桁で四捨五入。丸めた結果には「約」を付けています。']);
    } else {
        const total = read('split-total', '合計金額', 0), people = read('split-people', '人数', 0, 999n, true);
        const each = total.n / people.n, rest = total.n % people.n;
        show(mode, '1人あたり', `${each.toLocaleString('ja-JP')}円`, [`残り：${rest.toLocaleString('ja-JP')}円（未配分）`, `${each.toLocaleString('ja-JP')}円 × ${people.n}人 ＋ ${rest.toLocaleString('ja-JP')}円 ＝ ${total.n.toLocaleString('ja-JP')}円`, rest ? '残りの金額を誰が負担するかは、別途決めてください。' : '全額を均等に分けられます。']);
    }
}
for (const mode of modes) {
    const tab = el(`${mode}-tab`), form = el(`${mode}-form`);
    form.querySelector('fieldset').disabled = false;
    tab.onclick = () => activate(mode);
    tab.onkeydown = event => {
        const index = modes.indexOf(mode); let next;
        if (event.key === 'ArrowRight') next = modes[(index + 1) % modes.length];
        if (event.key === 'ArrowLeft') next = modes[(index + modes.length - 1) % modes.length];
        if (event.key === 'Home') next = modes[0]; if (event.key === 'End') next = modes.at(-1);
        if (next) { event.preventDefault(); activate(next); el(`${next}-tab`).focus(); }
    };
    form.addEventListener('input', () => invalidate(mode));
    form.addEventListener('change', () => invalidate(mode));
    form.onsubmit = event => {
        event.preventDefault(); invalidate(mode);
        try { calculate(mode); }
        catch (error) {
            el(`${mode}-error`).textContent = error.message;
            if (error.inputId) { el(error.inputId).setAttribute('aria-invalid', 'true'); el(error.inputId).focus(); }
        }
    };
}
el('ratio-kind').onchange = () => {
    const percent = el('ratio-kind').value === 'percent';
    el('ratio-part-label').textContent = percent ? '一部の値' : '割合（%）';
    el('ratio-example').textContent = percent ? '例：全体800のうち200は何%か。' : '例：800の25%分はいくつか。';
    el('ratio-note').textContent = percent ? '0以上、小数4桁まで。全体の何%かを調べるとき、全体は0より大きい値。' : '全体は0〜999,999,999.9999、割合は0〜1,000,000%。小数4桁まで。';
    // 同じ欄が「値」と「率」で意味を変えるため、この欄だけ空へ戻して取り違えを防ぐ。
    el('ratio-part').value = ''; invalidate('ratio');
};
})();
