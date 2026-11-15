/**
 * @file 対応範囲を限定した正規表現サンプル生成器。未対応構文は無視せずエラーにする。
 */
/**
 * @typedef {Object} SampleNode
 * @property {string} type choice/alternatives/repeatのノード種別。
 * @property {string[]} [values] choiceの文字候補。
 * @property {SampleNode[][]} [alternatives] alternativesの選択肢ごとの連続ノード。
 * @property {SampleNode} [node] repeatで繰り返すノード。
 * @property {number} [min] 繰返しの下限（単位：回）。
 * @property {number} [max] 繰返しの上限（単位：回）。
 */
/**
 * 対応する正規表現の構文木から例を生成し、式全体に一致するものだけを返す。
 *
 * @param {string} pattern サンプル生成に対応した正規表現本体。ASCII文字/文字クラス/選択/グループ/回数指定を使う。
 * @param {string} flags 空文字またはuだけ。
 * @param {number} amount 要求する生成件数（1〜10の整数、単位：件）。
 * @param {function(): number} [random=Math.random] 0以上1未満の乱数を返す関数。試験用サンプルでありパスワード用ではない。
 * @returns {{samples: string[], count: number, requested: number, output: string}} 重複のない生成例・実件数・要求数・表示文字列。100試行/1件256文字の制限により不足する場合がある。
 * @throws {Error} 未対応構文、入れ子/構文数/回数の上限超過、件数/フラグの不正の場合。
 */
export function generateSamples(pattern, flags, amount, random = Math.random) {
    if (!Number.isInteger(amount) || amount < 1 || amount > 10) throw new Error('生成件数は1〜10件にしてください。');
    if (!/^(u)?$/.test(flags)) throw new Error('サンプル生成のフラグはuのみ対応しています。');
    let source = pattern;
    if (source.startsWith('^')) source = source.slice(1);
    if (source.endsWith('$')) {
        let slashes = 0; for (let i = source.length - 2; i >= 0 && source[i] === '\\'; i--) slashes++;
        if (slashes % 2 === 0) source = source.slice(0, -1);
    }
    let at = 0, nodes = 0;
    /**
     * 未対応構文を検出した位置で生成処理を止める。
     *
     * @returns {never}
     * @throws {Error} 対応範囲外を伝えるエラー。
     */
    const unsupported = () => { throw new Error('この構文でのサンプル生成は未対応です。ヘルプの対応範囲を確認してください。'); };
    /**
     * 空でない候補配列から1要素を選ぶ。
     *
     * @template T
     * @param {T[]} values 候補配列。
     * @returns {T} 選択した要素。
     */
    const choose = values => values[Math.floor(random() * values.length)];
    /**
     * 現在位置のエスケープ構文を読み、文字候補へ変換して読取位置を進める。
     *
     * @param {boolean} [inClass=false] 文字クラス内で読むか。
     * @returns {string[]} エスケープが表す文字候補。
     * @throws {Error} 対応しないエスケープの場合。
     */
    function escaped(inClass = false) {
        const c = source[at++];
        if (c === 'd') return Array.from('0123456789');
        if (c === 'w') return Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_');
        if (c === 's') return [' '];
        if (c === 'n') return ['\n'];
        if (c === 't') return ['\t'];
        if (c && '\\^$.*+?()[]{}|/-'.includes(c) && (inClass || c !== '-')) return [c];
        unsupported();
    }
    /**
     * 現在位置から式を再帰的に読み、選択と繰返しを構文木へまとめる。
     *
     * @param {number} [depth=0] グループの入れ子深さ（最大20）。
     * @returns {SampleNode} 解析した式のノード。
     * @throws {Error} 未対応構文、2000ノード超、入れ子/繰返し回数超過の場合。
     */
    function expression(depth = 0) {
        if (depth > 20) throw new Error('グループの入れ子は20段階までです。');
        const alternatives = []; let sequence = [];
        while (at < source.length && source[at] !== ')') {
            if (++nodes > 2000) throw new Error('正規表現が複雑すぎます。');
            if (source[at] === '|') { at++; alternatives.push(sequence); sequence = []; continue; }
            let node; const c = source[at++];
            if (c === '(') {
                if (source.slice(at, at + 2) === '?:') at += 2;
                else if (source[at] === '?') unsupported();
                node = expression(depth + 1);
                if (source[at++] !== ')') unsupported();
            } else if (c === '[') {
                if (source[at] === '^') unsupported();
                let values = [];
                while (at < source.length && source[at] !== ']') {
                    let first = source[at++] === '\\' ? escaped(true) : [source[at - 1]];
                    if (source[at] === '-' && source[at + 1] !== ']') {
                        at++; const last = source[at++] === '\\' ? escaped(true) : [source[at - 1]];
                        if (first.length !== 1 || last.length !== 1) unsupported();
                        const start = first[0].codePointAt(0), end = last[0].codePointAt(0);
                        if (start > end || end > 127 || start < 32) unsupported();
                        first = Array.from({ length: end - start + 1 }, (_, i) => String.fromCodePoint(start + i));
                    }
                    if (first.some(value => value.codePointAt(0) > 127)) unsupported();
                    values.push(...first);
                }
                if (source[at++] !== ']' || !values.length) unsupported();
                node = { type: 'choice', values };
            } else if (c === '\\') node = { type: 'choice', values: escaped() };
            else {
                if ('^$.*+?{}]'.includes(c) || c.codePointAt(0) < 32 || c.codePointAt(0) > 126) unsupported();
                node = { type: 'choice', values: [c] };
            }
            let min = 1, max = 1;
            const quantifier = source[at];
            if (quantifier === '?' || quantifier === '*' || quantifier === '+') { at++; min = quantifier === '+' ? 1 : 0; max = quantifier === '?' ? 1 : 10; }
            else if (quantifier === '{') {
                const match = /^\{(\d+)(?:,(\d+))?\}/.exec(source.slice(at));
                if (!match) unsupported();
                at += match[0].length; min = Number(match[1]); max = Number(match[2] ?? match[1]);
                if (min > max || max > 100) throw new Error('回数指定は0〜100回の範囲で指定してください。');
            }
            sequence.push({ type: 'repeat', node, min, max });
        }
        alternatives.push(sequence);
        return { type: 'alternatives', alternatives };
    }
    const tree = expression(); if (at !== source.length) unsupported();
    /**
     * 構文木から文字列を1候補作る。
     *
     * @param {SampleNode} node 描画する構文ノード。
     * @param {number} budget 残り生成可能文字数（この生成器はASCII中心）。
     * @returns {string} 候補文字列。
     * @throws {Error} 生成途中で文字数上限を超えた場合。
     */
    function render(node, budget) {
        if (node.type === 'choice') return choose(node.values);
        if (node.type === 'alternatives') {
            let result = '';
            for (const item of choose(node.alternatives)) { result += render(item, budget - result.length); if (result.length > budget) throw new Error('生成文字数の上限'); }
            return result;
        }
        const times = node.min + Math.floor(random() * (node.max - node.min + 1)); let result = '';
        for (let i = 0; i < times; i++) { result += render(node.node, budget - result.length); if (result.length > budget) throw new Error('生成文字数の上限'); }
        return result;
    }
    // 構文木が作った候補も元の式で全文一致を確認し、重複を除いて返す。
    const regex = new RegExp(pattern, flags), samples = new Set();
    for (let tries = 0; tries < 100 && samples.size < amount; tries++) {
        let candidate; try { candidate = render(tree, 256); } catch { continue; }
        const match = regex.exec(candidate);
        if (match && match.index === 0 && match[0] === candidate) samples.add(candidate);
    }
    const values = [...samples];
    return { samples: values, count: values.length, requested: amount, output: values.map(value => value === '' ? '（空文字）' : value).join('\n') };
}
