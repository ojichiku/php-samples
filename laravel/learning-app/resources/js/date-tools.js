import {validateYear, japanToday, dateLabel, eraSegments, westernToEra, eraToWestern, eraTable, daysBetween, shiftDays, ageAt} from './date-tools-engine.js';

const root = document.getElementById('date-tools');
if (root) {
    const $ = id => root.querySelector(`#${id}`);
    const results = new Map();
    const futureNote = year => year > Number(japanToday().slice(0, 4)) ? '\n※未来年は、現在の令和が続く場合の換算です。' : '';
    const shortDate = date => date.slice(5).replace('-', '月') + '日';
    let generation = 0;
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
        age() {
            const birth = $('birth-date').value, reference = $('age-reference').value, policy = $('leap-policy').value;
            const age = ageAt(birth, reference, policy);
            const note = birth.endsWith('-02-29') ? `\n平年の誕生日は${policy === 'march' ? '3月1日' : '2月28日'}として計算` : '';
            show('age', `満${age}歳\n誕生日：${dateLabel(birth)}\n基準日：${dateLabel(reference)}${note}`);
        },
    };
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
    root.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => {
        root.querySelectorAll('[data-panel]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        root.querySelectorAll('section').forEach(panel => panel.hidden = panel.id !== button.dataset.panel);
    }));
    root.querySelectorAll('[data-form]').forEach(form => {
        form.addEventListener('submit', event => {
            event.preventDefault();
            try { handlers[form.dataset.form](); }
            catch (error) { show(form.dataset.form, error.message, true); }
        });
        for (const event of ['input', 'change']) form.addEventListener(event, () => { updateControls(); invalidate(form.dataset.form); });
    });
    root.querySelectorAll('[data-clear]').forEach(button => button.addEventListener('click', () => {
        const panel = button.dataset.clear;
        root.querySelector(`[data-form="${panel}"]`).querySelectorAll('input').forEach(input => {
            if (input.type === 'checkbox') input.checked = false;
            else input.value = '';
        });
        invalidate(panel);
    }));
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
    $('table-near-today').addEventListener('click', () => {
        const year = Number(japanToday().slice(0, 4));
        $('table-start').value = Math.max(1873, Math.min(2100, year - 10));
        $('table-end').value = Math.min(2100, Math.max(1873, year + 10));
        invalidate('table');
    });
    $('age-today').addEventListener('click', () => { $('age-reference').value = japanToday(); invalidate('age'); });
    $('age-reference').value = japanToday();
    updateControls();
    root.querySelectorAll('[data-date-inputs]').forEach(fieldset => fieldset.disabled = false);
    window.addEventListener('pagehide', () => {
        root.querySelectorAll('input').forEach(input => {
            if (input.type === 'checkbox') input.checked = false;
            else input.value = '';
        });
        Object.keys(handlers).forEach(invalidate);
    });
}
