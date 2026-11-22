<?php

namespace App\Http\Controllers;

use App\Services\YearCalendar;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Symfony\Component\HttpKernel\Exception\HttpException;

/** GET /calendarの表示年を検証し、年間データをBladeへ渡す単一アクション。 */
class CalendarController extends Controller
{
    /**
     * 表示年と月を検証し、今年の初期月は日本時間の当月、他の年は1月にする。
     *
     * @param  Request  $request  任意のyear（4桁の西暦年）とmonth（1〜12）を持つGETリクエスト。
     * @param  YearCalendar  $calendar  暦データを組み立てるサービス。
     * @return View 検証した年のカレンダー画面。
     *
     * @throws HttpException 年・月の書式または範囲に違反する場合（422）。
     */
    public function __invoke(Request $request, YearCalendar $calendar): View
    {
        $input = $request->query->has('year') ? $request->query('year') : now('Asia/Tokyo')->year;
        abort_unless(is_scalar($input) && preg_match('/\A[0-9]{4}\z/D', (string) $input), 422, '年は1900〜2100の整数で指定してください。');
        $year = (int) $input;
        abort_unless($year >= YearCalendar::MIN_YEAR && $year <= YearCalendar::MAX_YEAR, 422, '年は1900〜2100の範囲で指定してください。');

        $monthInput = $request->query('month');
        abort_if(
            $request->query->has('month')
                && (! is_scalar($monthInput) || ! preg_match('/\A(?:0?[1-9]|1[0-2])\z/', (string) $monthInput)),
            422,
            '月は1〜12の整数で指定してください。',
        );

        $data = $calendar->build($year);
        $month = $monthInput === null
            ? ($year === $data['currentYear'] ? (int) substr($data['today'], 5, 2) : 1)
            : (int) $monthInput;

        // 月初を基準にすれば、月末の日数や年またぎに左右されずに前後の月を求められる。
        $selectedDate = CarbonImmutable::createMidnightDate($year, $month, 1);

        return view('tools.calendar', $data + [
            'selectedMonth' => $month,
            'previousMonth' => $selectedDate->subMonth(),
            'nextMonth' => $selectedDate->addMonth(),
        ]);
    }
}
