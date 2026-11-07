import { countText, codepoints } from './text-tools-engine.js';

const root = document.querySelector('#text-tools');
if (root) {
    const analytics = document.querySelector('[data-text-analytics]');
    if (analytics) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        const id = analytics.dataset.textAnalytics;
        window.gtag('js', new Date());
        window.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, ignore_referrer: true });
        window.gtag('event', 'page_view', { page_location: location.origin + location.pathname, page_referrer: '', page_title: 'テキスト便利ツール集' });
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
        document.head.append(script);
    }
    const track = (tool, outcome) => {
        if (analytics) window.gtag('event', 'text_tool_run', { tool_name: tool, outcome, page_location: location.origin + location.pathname, page_referrer: '' });
    };
    for (const link of document.querySelectorAll('.text-tool-nav a')) {
        link.addEventListener('click', () => {
            const target = document.querySelector(link.hash);
            if (target) { target.open = true; target.querySelector('summary').focus(); }
        });
    }
    for (const tool of root.querySelectorAll('[data-tool]')) {
        const name = tool.dataset.tool;
        const field = key => tool.querySelector(`[data-field="${key}"]`);
        const status = tool.querySelector('[data-status]');
        const output = tool.querySelector('[data-output]');
        const run = tool.querySelector('[data-run]');
        const cancel = tool.querySelector('[data-cancel]');
        const copy = tool.querySelector('[data-copy]');
        const clear = tool.querySelector('[data-clear]');
        let worker = null, timer = null, tableText = '';
        const stop = () => {
            if (worker) worker.terminate(); worker = null;
            clearTimeout(timer); timer = null;
            if (cancel) cancel.hidden = true;
            if (run) run.disabled = !('Worker' in window);
        };
        const invalidate = () => {
            stop();
            if (output) output.value = '';
            if (copy) copy.disabled = true;
            tableText = '';
            const results = tool.querySelector('[data-match-results]');
            if (results) {
                results.hidden = true;
                tool.querySelector('[data-highlight]').replaceChildren();
                tool.querySelector('[data-matches]').replaceChildren();
                tool.querySelector('[data-copy-list]').disabled = true;
            }
        };
        const sync = () => {
            const regex = field('mode')?.value === 'regex';
            const regexFields = tool.querySelector('[data-regex-fields]');
            if (regexFields && ['replace', 'convert'].includes(name)) regexFields.hidden = !regex;
            const literal = tool.querySelector('[data-literal-fields]'); if (literal) literal.hidden = regex;
            const targets = tool.querySelector('[data-width-targets]');
            if (targets) targets.hidden = !['half', 'full'].includes(field('operation').value);
            clear.disabled = false;
        };
        const renderMatches = result => {
            const highlight = tool.querySelector('[data-highlight]'), rows = tool.querySelector('[data-matches]');
            let previous = 0;
            const rowFragment = document.createDocumentFragment(), textFragment = document.createDocumentFragment();
            const lines = ['番号\t一致文字列\t行\t列\tキャプチャ'];
            result.matches.forEach((match, i) => {
                textFragment.append(document.createTextNode(result.text.slice(previous, match.index)));
                const mark = document.createElement('mark');
                mark.textContent = match.value === '' ? '│' : match.value;
                mark.title = `${i + 1}件目${match.value === '' ? '（空文字）' : ''}`;
                textFragment.append(mark); previous = match.index + match.value.length;
                const captures = JSON.stringify({ numbered: match.captures, named: match.groups });
                const row = document.createElement('tr');
                for (const value of [String(i + 1), match.value === '' ? '（空文字）' : match.value, `${match.row}行${match.column}列`, captures]) {
                    const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
                }
                rowFragment.append(row); lines.push([i + 1, JSON.stringify(match.value), match.row, match.column, captures].join('\t'));
            });
            textFragment.append(document.createTextNode(result.text.slice(previous)));
            highlight.replaceChildren(textFragment); rows.replaceChildren(rowFragment);
            tool.querySelector('[data-match-results]').hidden = false;
            tableText = lines.join('\n'); tool.querySelector('[data-copy-list]').disabled = result.count === 0;
        };
        const copyValue = async (value, fallback) => {
            try {
                if (!navigator.clipboard?.writeText) throw new Error();
                await navigator.clipboard.writeText(value); status.textContent = 'コピーしました。';
            } catch {
                fallback.focus(); fallback.select(); status.textContent = '自動コピーできませんでした。結果を選択して手動でコピーしてください。';
            }
        };
        copy?.addEventListener('click', () => copyValue(output.value, output));
        tool.querySelector('[data-copy-list]')?.addEventListener('click', () => {
            const previous = output.value;
            output.value = tableText;
            copyValue(tableText, output).then(() => { if (document.activeElement !== output) output.value = previous; });
        });
        tool.addEventListener('input', event => {
            if (event.target.matches('[data-output]')) return;
            invalidate(); sync(); status.textContent = '';
            if (name === 'count') {
                try {
                    const counts = countText(field('text').value);
                    tool.querySelector('[data-stats]').textContent = `文字数 ${counts.characters} ／ 空白除外 ${counts.withoutSpaces} ／ 行数 ${counts.lines}`;
                } catch (error) { tool.querySelector('[data-stats]').textContent = '計測できません'; status.textContent = error.message; }
            }
        });
        clear.addEventListener('click', () => {
            const populated = [...tool.querySelectorAll('textarea:not([readonly]), input[type=text]')].some(input => input.value);
            if (populated && !window.confirm('このツールの入力と結果を消去しますか？')) return;
            invalidate();
            for (const input of tool.querySelectorAll('textarea, input[type=text]')) input.value = '';
            if (name === 'count') tool.querySelector('[data-stats]').textContent = '文字数 0 ／ 空白除外 0 ／ 行数 0';
            status.textContent = 'このツールの内容を消去しました。'; sync();
        });
        cancel?.addEventListener('click', () => { stop(); status.textContent = '中止しました。入力は保持しています。'; });
        run?.addEventListener('click', () => {
            invalidate(); sync();
            const options = { tool: name, flags: [...tool.querySelectorAll('[data-flag]:checked')].map(input => input.dataset.flag).join('') };
            if (name === 'generate') options.flags = 'u';
            for (const input of tool.querySelectorAll('[data-field]')) options[input.dataset.field] = input.value;
            options.targets = [...tool.querySelectorAll('[data-target]:checked')].map(input => input.dataset.target);
            if (codepoints(options.text ?? '') > 100_000) { status.textContent = '入力は10万文字以内にしてください。'; return; }
            try {
                worker = new Worker(new URL('./text-tools-worker.js', import.meta.url), { type: 'module' });
                run.disabled = true; cancel.hidden = false; status.textContent = '処理中です…';
                worker.onmessage = ({ data }) => {
                    stop();
                    if (!data.ok) { status.textContent = data.error; track(name, 'error'); return; }
                    const result = data.result; output.value = result.output;
                    copy.disabled = result.output === '';
                    if (name === 'match') {
                        renderMatches(result);
                        status.textContent = result.truncated ? '先頭1,000件を表示・以降は未確認です。' : `${result.count}件一致しました。`;
                    } else if (name === 'generate') {
                        status.textContent = result.count === 0 ? '条件内で生成できませんでした。' : `${result.count}件生成し、全体への一致を検証しました。${result.count < result.requested ? '要求件数に達しませんでした。' : ''}`;
                    } else {
                        status.textContent = result.output === '' ? '結果は空です。' : result.output === (options.text ?? '').replace(/\r\n?/g, '\n') ? '変更はありません。' : '処理しました。';
                        if (result.count !== undefined) status.textContent += ` 一致・置換 ${result.count}件。`;
                        if (result.changed !== undefined && name === 'convert') status.textContent += ` 変化 ${result.changed}件。`;
                    }
                    track(name, 'success');
                };
                worker.onerror = () => { stop(); status.textContent = '処理を開始できませんでした。ページを再読込みしてください。'; track(name, 'error'); };
                worker.postMessage(options);
                timer = setTimeout(() => { stop(); status.textContent = '処理に時間がかかるため中止しました。入力は保持しています。'; track(name, 'timeout'); }, 1000);
            } catch { stop(); status.textContent = 'このブラウザーは別領域での処理に対応していません。'; }
        });
        sync();
        if (run && !('Worker' in window)) status.textContent = 'このブラウザーはWeb Workerに対応していません。';
        window.addEventListener('pagehide', () => { invalidate(); for (const input of tool.querySelectorAll('textarea, input[type=text]')) input.value = ''; });
    }
}
