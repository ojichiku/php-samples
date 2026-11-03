<?php

namespace Tests\Unit\Services;

use App\Services\YearCalendar;
use PHPUnit\Framework\TestCase;

class YearCalendarTest extends TestCase
{
    private function calendar(): YearCalendar
    {
        return new YearCalendar(__DIR__.'/../../../resources/calendar');
    }

    public function test_leap_century_boundaries_and_every_year_have_correct_day_count(): void
    {
        for ($year = 1900; $year <= 2100; $year++) {
            $data = $this->calendar()->build($year);
            $days = array_merge(...array_map(fn ($month) => array_values(array_filter(array_merge(...$month['weeks']))), $data['months']));
            $expected = $year % 4 === 0 && ($year % 100 !== 0 || $year % 400 === 0) ? 366 : 365;
            $this->assertCount($expected, $days, (string) $year);
            $this->assertCount($expected, array_unique(array_column($days, 'date')));
        }
    }

    public function test_holiday_special_cases_and_substitute_holidays_come_from_official_data(): void
    {
        $this->assertSame('休日', $this->calendar()->build(2026)['holidays']['2026-09-22']);
        $this->assertSame('休日', $this->calendar()->build(2026)['holidays']['2026-05-06']);
        $this->assertSame('海の日', $this->calendar()->build(2021)['holidays']['2021-07-22']);
        $this->assertArrayNotHasKey('2021-07-19', $this->calendar()->build(2021)['holidays']);
        $this->assertSame('休日', $this->calendar()->build(2019)['holidays']['2019-04-30']);
    }

    public function test_rokuyo_against_published_lunar_month_boundaries_and_leap_month(): void
    {
        $days = array_merge(...array_map(fn ($month) => array_values(array_filter(array_merge(...$month['weeks']))), $this->calendar()->build(2026)['months']));
        $days = array_column($days, null, 'date');
        foreach (['2026-01-01' => '大安', '2026-02-17' => '先勝', '2026-03-19' => '友引', '2026-11-01' => '赤口', '2026-11-09' => '仏滅'] as $date => $rokuyo) {
            $this->assertSame($rokuyo, $days[$date]['rokuyo'], $date);
        }
        $days2025 = array_merge(...array_map(fn ($month) => array_values(array_filter(array_merge(...$month['weeks']))), $this->calendar()->build(2025)['months']));
        $days2025 = array_column($days2025, null, 'date');
        $this->assertSame('赤口', $days2025['2025-07-25']['rokuyo']);
    }

    public function test_era_transition_years_are_not_overwritten_with_a_single_era(): void
    {
        $this->assertSame('明治45年／大正元年', $this->calendar()->eraLabel(1912));
        $this->assertSame('大正15年／昭和元年', $this->calendar()->eraLabel(1926));
        $this->assertSame('昭和64年／平成元年', $this->calendar()->eraLabel(1989));
        $this->assertSame('平成31年／令和元年', $this->calendar()->eraLabel(2019));
    }
}
