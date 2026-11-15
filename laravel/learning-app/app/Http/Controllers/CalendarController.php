<?php

namespace App\Http\Controllers;

use App\Services\YearCalendar;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Symfony\Component\HttpKernel\Exception\HttpException;

/** GET /calendarの表示年を検証し、年間データをBladeへ渡す単一アクション。 */
class CalendarController extends Controller
{
    /**
     * 年の指定がなければ日本時間の今年を使い、範囲外ならHTTP422で止める。
     *
     * @param  Request  $request  任意のyearクエリー（4桁の西暦年）を持つGETリクエスト。
     * @param  YearCalendar  $calendar  暦データを組み立てるサービス。
     * @return View 検証した年のカレンダー画面。
     *
     * @throws HttpException 年の書式または1900〜2100の範囲に違反する場合（422）。
     */
    public function __invoke(Request $request, YearCalendar $calendar): View
    {
        $input = $request->query->has('year') ? $request->query('year') : now('Asia/Tokyo')->year;
        abort_unless(is_scalar($input) && preg_match('/\A[0-9]{4}\z/D', (string) $input), 422, '年は1900〜2100の整数で指定してください。');
        $year = (int) $input;
        abort_unless($year >= YearCalendar::MIN_YEAR && $year <= YearCalendar::MAX_YEAR, 422, '年は1900〜2100の範囲で指定してください。');

        return view('tools.calendar', $calendar->build($year));
    }
}
