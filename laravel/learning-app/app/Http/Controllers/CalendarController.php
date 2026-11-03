<?php

namespace App\Http\Controllers;

use App\Services\YearCalendar;
use Illuminate\Http\Request;
use Illuminate\View\View;

class CalendarController extends Controller
{
    public function __invoke(Request $request, YearCalendar $calendar): View
    {
        $input = $request->query->has('year') ? $request->query('year') : now('Asia/Tokyo')->year;
        abort_unless(is_scalar($input) && preg_match('/\A[0-9]{4}\z/D', (string) $input), 422, '年は1900〜2100の整数で指定してください。');
        $year = (int) $input;
        abort_unless($year >= YearCalendar::MIN_YEAR && $year <= YearCalendar::MAX_YEAR, 422, '年は1900〜2100の範囲で指定してください。');

        return view('tools.calendar', $calendar->build($year));
    }
}
