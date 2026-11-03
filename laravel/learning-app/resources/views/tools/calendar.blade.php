<x-layout title="年間カレンダー" active="calendar">
    <section class="page-heading compact calendar-heading">
        <a class="back-link" href="{{ route('tools.index') }}">← ツール一覧</a>
        <p class="eyebrow">一年を、ひと目で。</p>
        <h1>年間カレンダー</h1>
        <p class="lead">祝日・六曜・記念日を、一年分まとめて確認できます。</p>
    </section>
    <section class="calendar-toolbar panel" aria-label="表示年の選択">
        <div class="calendar-year"><p class="calendar-today-label">今日：<time datetime="{{ $today }}">{{ $todayLabel }}</time>（日本時間）</p><h2>{{ $year }}年 <span>{{ $era }}</span></h2>
            @if($year > $currentYear)<p class="field-help">元号は現行の令和で換算しています。将来の改元は反映していません。</p>@endif
        </div>
        <div class="calendar-controls">
            @if($year > $minYear)<a class="button secondary" href="{{ route('calendar', ['year' => $year - 1]) }}">← 前年</a>@endif
            <form method="GET" action="{{ route('calendar') }}">
                <label for="calendar-year">西暦</label>
                <input id="calendar-year" name="year" type="number" min="{{ $minYear }}" max="{{ $maxYear }}" value="{{ $year }}" required>
                <button class="button" type="submit">表示</button>
            </form>
            @if($year < $maxYear)<a class="button secondary" href="{{ route('calendar', ['year' => $year + 1]) }}">翌年 →</a>@endif
            <a class="calendar-current" href="{{ route('calendar') }}">今年に戻る</a>
        </div>
    </section>
    <div class="calendar-notices">
        <p><span class="calendar-legend holiday-text">日曜・祝日</span> <span class="calendar-legend saturday-text">土曜</span> <span class="calendar-legend">「今日」の文字と枠が目印</span> <span>記念日のある日は、日付を開くと名前を確認できます。</span></p>
        @unless($holidayCovered)<p class="calendar-warning" role="status">{{ $year }}年の祝日データは未収録です。祝日がないという意味ではありません。</p>@endunless
        @unless($rokuyoCovered)<p class="calendar-warning">この年の六曜は一部または全部が未収録です。収録されている日だけ表示します。</p>@endunless
    </div>
    <section class="year-grid" aria-label="{{ $year }}年の12か月">
        @foreach($months as $month)
            <article class="month-card" id="month-{{ $month['number'] }}">
                <h2>{{ $month['number'] }}<span>月</span></h2>
                <table class="month-table">
                    <caption class="sr-only">{{ $year }}年{{ $month['number'] }}月</caption>
                    <thead><tr>@foreach(['日', '月', '火', '水', '木', '金', '土'] as $weekday)<th scope="col">{{ $weekday }}</th>@endforeach</tr></thead>
                    <tbody>
                        @foreach($month['weeks'] as $week)<tr>
                            @foreach($week as $day)
                                @if($day === null)<td class="empty-day"></td>@else
                                    <td @class(['calendar-day', 'is-today' => $day['today'], 'is-holiday' => $day['holiday'] !== null || $day['weekday'] === 0, 'is-saturday' => $day['weekday'] === 6 && $day['holiday'] === null]) data-date="{{ $day['date'] }}" @if($day['today']) aria-current="date" @endif>
                                        @if(count($day['anniversaries']))
                                            <details class="day-details"><summary aria-label="{{ $day['date'] }}の記念日"><time datetime="{{ $day['date'] }}">{{ $day['day'] }}</time><span class="anniversary-mark" aria-hidden="true">●</span></summary>
                                                <div class="anniversary-content">@foreach($day['anniversaries'] as $anniversary)<a href="{{ $anniversary['source'] }}">{{ $anniversary['name'] }}</a>@endforeach</div>
                                            </details>
                                        @else<time datetime="{{ $day['date'] }}">{{ $day['day'] }}</time>@endif
                                        @if($day['today'])<span class="today-mark">今日</span>@endif
                                        <span class="day-rokuyo">{{ $day['rokuyo'] ?? '—' }}</span>
                                        @if($day['holiday'])<span class="day-holiday">{{ $day['holiday'] }}</span>@endif
                                    </td>
                                @endif
                            @endforeach
                        </tr>@endforeach
                    </tbody>
                </table>
            </article>
        @endforeach
    </section>
    <section class="panel holiday-list" aria-labelledby="holiday-heading">
        <h2 id="holiday-heading">{{ $year }}年の祝日・休日一覧</h2>
        @if($holidayCovered)
            <dl>@foreach($holidays as $date => $name)<div><dt><a href="#month-{{ (int) substr($date, 5, 2) }}">{{ (int) substr($date, 5, 2) }}月{{ (int) substr($date, 8, 2) }}日</a></dt><dd>{{ $name }}</dd></div>@endforeach</dl>
        @else<p>この年の祝日データは未収録です。</p>@endif
    </section>
    <section class="calendar-sources" aria-labelledby="calendar-sources-heading">
        <h2 id="calendar-sources-heading">データについて</h2>
        <p>表示範囲は1900〜2100年です。祝日・休日は<a href="https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html">内閣府の公表データ</a>（{{ $holidayMetadata['first_year'] }}〜{{ $holidayMetadata['last_year'] }}年、確認日 {{ $holidayMetadata['checked_on'] }}）を使用しています。収録範囲外の祝日は推測で追加していません。</p>
        <p>六曜は<a href="https://github.com/zizicici/kyureki-json">kyureki-json</a>の旧暦データに基づく参考表示です（1931年2月17日〜2100年2月8日）。2033年前後を含む旧暦の扱いは暦によって異なる場合があります。六曜は吉凶を保証するものではありません。</p>
        <p>記念日は現在「犬の日」（11月1日、1987年以降）を収録しています。祝日とは別の表示です。元号が変わった年は両方の元号を表示します。</p>
    </section>
</x-layout>
