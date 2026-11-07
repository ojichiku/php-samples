import { generateSamples } from './text-tools-samples.js';

export const INPUT_LIMIT = 100_000;
export const OUTPUT_LIMIT = 1_000_000;
const normalize = value => String(value ?? '').replace(/\r\n?/g, '\n');
export const codepoints = value => Array.from(value).length;
function bounded(value) {
    if (value.length > OUTPUT_LIMIT * 2 || codepoints(value) > OUTPUT_LIMIT) throw new Error('結果が100万文字を超えるため中止しました。');
    return value;
}
export function countText(value) {
    const text = normalize(value);
    if (codepoints(text) > INPUT_LIMIT) throw new Error('入力は10万文字以内にしてください。');
    if (typeof Intl.Segmenter !== 'function') throw new Error('このブラウザーは書記素単位の文字数計測に対応していません。');
    const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
    const count = s => { let n = 0; for (const _ of segmenter.segment(s)) n++; return n; };
    return { characters: count(text.replace(/\n/g, '')), withoutSpaces: count(text.replace(/[ \u3000\t\n]/g, '')), lines: text === '' ? 0 : text.split('\n').length };
}
function compile(pattern, flags) {
    if (!pattern) throw new Error('正規表現を入力してください。');
    if (codepoints(pattern) > 1000) throw new Error('正規表現は1,000文字以内にしてください。');
    if (!/^(?!.*(.).*\1)[imsu]*$/.test(flags)) throw new Error('正規表現のフラグが不正です。');
    try { return new RegExp(pattern, flags + 'g'); } catch { throw new Error('正規表現の構文を確認してください。'); }
}
function* matches(regex, text) {
    let match;
    while ((match = regex.exec(text)) !== null) {
        yield match;
        if (match[0] === '') {
            const cp = text.codePointAt(regex.lastIndex);
            regex.lastIndex += regex.unicode && cp > 0xffff ? 2 : 1;
        }
    }
}
function convert(value, options) {
    if (options.operation === 'upper') return value.replace(/[a-z]/g, c => c.toUpperCase());
    if (options.operation === 'lower') return value.replace(/[A-Z]/g, c => c.toLowerCase());
    if (!['half', 'full'].includes(options.operation)) throw new Error('変換方法を選んでください。');
    if (!options.targets?.length) throw new Error('変換対象を選んでください。');
    return Array.from(value, character => {
        let point = character.codePointAt(0);
        const ascii = point === 0x3000 ? 32 : point >= 0xff01 && point <= 0xff5e ? point - 0xfee0 : point;
        const group = ascii === 32 ? 'space' : /[A-Za-z]/.test(String.fromCodePoint(ascii)) ? 'letters' : ascii >= 48 && ascii <= 57 ? 'numbers' : ascii >= 33 && ascii <= 126 ? 'symbols' : null;
        if (!group || !options.targets.includes(group)) return character;
        if (options.operation === 'half') return String.fromCodePoint(ascii);
        return String.fromCodePoint(ascii === 32 ? 0x3000 : ascii + 0xfee0);
    }).join('');
}
function replacementValue(template, match, text) {
    return template.replace(/\$(\$|&|`|'|\d{1,2}|<[^>]*>)/g, (token, key) => {
        if (key === '$') return '$';
        if (key === '&') return match[0];
        if (key === '`') return text.slice(0, match.index);
        if (key === "'") return text.slice(match.index + match[0].length);
        if (key.startsWith('<')) return match.groups ? (match.groups[key.slice(1, -1)] ?? '') : token;
        const n = Number(key);
        if (n > 0 && n < match.length) return match[n] ?? '';
        if (key.length === 2 && Number(key[0]) > 0 && Number(key[0]) < match.length) return (match[Number(key[0])] ?? '') + key[1];
        return token;
    });
}
function transformMatches(text, regex, callback) {
    let previous = 0, count = 0, changed = 0, output = '', length = 0;
    const append = chunk => {
        length += codepoints(chunk);
        if (length > OUTPUT_LIMIT) throw new Error('結果が100万文字を超えるため中止しました。');
        output += chunk;
    };
    for (const match of matches(regex, text)) {
        append(text.slice(previous, match.index));
        const replacement = callback(match);
        append(replacement);
        count++; if (replacement !== match[0]) changed++;
        previous = match.index + match[0].length;
    }
    append(text.slice(previous));
    return { output, count, changed };
}
const compareLines = (a, b) => {
    const x = Array.from(a, c => c.codePointAt(0)), y = Array.from(b, c => c.codePointAt(0));
    for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
    return x.length - y.length;
};
export function processText(options) {
    const text = normalize(options.text), pattern = normalize(options.pattern), flags = options.flags ?? 'u';
    if (codepoints(text) > INPUT_LIMIT) throw new Error('入力は10万文字以内にしてください。');
    if (options.tool === 'generate') {
        compile(pattern, flags);
        return generateSamples(pattern, flags, Number(options.amount));
    }
    if (options.tool !== 'match' && text === '') throw new Error('文章を入力してください。');
    if (options.tool === 'format') {
        let lines = text.split('\n');
        if (options.operation === 'trim') lines = lines.map(line => line.replace(/^[ \t\u3000]+|[ \t\u3000]+$/g, ''));
        else if (options.operation === 'blank') lines = lines.filter(line => !/^[ \t\u3000]*$/.test(line));
        else if (options.operation === 'collapse') {
            const collapsed = []; let blank = false;
            for (const line of lines) { const empty = /^[ \t\u3000]*$/.test(line); if (!empty || !blank) collapsed.push(empty ? '' : line); blank = empty; }
            lines = collapsed;
        } else throw new Error('整形方法を選んでください。');
        return { output: lines.join('\n') };
    }
    if (options.tool === 'lines') {
        let lines = text.split('\n');
        if (options.operation === 'unique') lines = [...new Set(lines)];
        else if (['asc', 'desc'].includes(options.operation)) { lines.sort(compareLines); if (options.operation === 'desc') lines.reverse(); }
        else throw new Error('行の整理方法を選んでください。');
        return { output: lines.join('\n') };
    }
    if (options.tool === 'replace') {
        const replacement = normalize(options.replacement);
        if (codepoints(replacement) > 1000) throw new Error('置換語は1,000文字以内にしてください。');
        if (options.mode === 'regex') return transformMatches(text, compile(pattern, flags), match => replacementValue(replacement, match, text));
        const search = normalize(options.search);
        if (!search || codepoints(search) > 1000) throw new Error('検索語は1〜1,000文字で入力してください。');
        const pieces = text.split(search);
        const size = codepoints(text) + (pieces.length - 1) * (codepoints(replacement) - codepoints(search));
        if (size > OUTPUT_LIMIT) throw new Error('結果が100万文字を超えるため中止しました。');
        return { output: bounded(pieces.join(replacement)), count: pieces.length - 1 };
    }
    if (options.tool === 'convert') {
        if (options.mode !== 'regex') return { output: convert(text, options) };
        return transformMatches(text, compile(pattern, flags), match => match[0] === '' ? '' : convert(match[0], options));
    }
    if (options.tool === 'match') {
        const found = []; let truncated = false;
        let positionIndex = 0, row = 1, column = 1;
        for (const match of matches(compile(pattern, flags), text)) {
            if (found.length === 1000) { truncated = true; break; }
            for (const c of text.slice(positionIndex, match.index)) { if (c === '\n') { row++; column = 1; } else column++; }
            positionIndex = match.index;
            found.push({ value: match[0], index: match.index, row, column, captures: match.slice(1).map(value => value ?? null), groups: match.groups ?? null });
        }
        return { text, matches: found, truncated, count: found.length, output: found.map(match => match.value === '' ? '（空文字）' : match.value).join('\n') };
    }
    throw new Error('ツールを選んでください。');
}
