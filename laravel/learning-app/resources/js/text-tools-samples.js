/** Bounded constructive generator. Unsupported syntax is rejected, never ignored. */
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
    const unsupported = () => { throw new Error('この構文でのサンプル生成は未対応です。ヘルプの対応範囲を確認してください。'); };
    const choose = values => values[Math.floor(random() * values.length)];
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
    const regex = new RegExp(pattern, flags), samples = new Set();
    for (let tries = 0; tries < 100 && samples.size < amount; tries++) {
        let candidate; try { candidate = render(tree, 256); } catch { continue; }
        const match = regex.exec(candidate);
        if (match && match.index === 0 && match[0] === candidate) samples.add(candidate);
    }
    const values = [...samples];
    return { samples: values, count: values.length, requested: amount, output: values.map(value => value === '' ? '（空文字）' : value).join('\n') };
}
