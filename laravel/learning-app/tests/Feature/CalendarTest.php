<?php

namespace Tests\Feature;

use App\Services\YearCalendar;
use Tests\TestCase;

class CalendarTest extends TestCase
{
    public function test_annual_calendar_displays_all_months_and_holidays(): void
    {
        $this->get('/calendar?year=2026')->assertOk()
            ->assertSee('2026年')->assertSee('令和8年')
            ->assertSee('2026-09-22')->assertSee('元日')->assertDontSee('犬の日')->assertDontSee('day-details')->assertDontSee('の記念日')
            ->assertSee('大安')->assertSee('仏滅')
            ->assertViewHas('months', fn ($months) => count($months) === 12)
            ->assertViewHas('holidayCovered', true)->assertViewHas('rokuyoCovered', true);
    }

    public function test_outside_data_years_explicitly_disclose_missing_data(): void
    {
        foreach ([1900, 2100] as $year) {
            $this->get('/calendar?year='.$year)->assertOk()
                ->assertSee('祝日データは未収録')->assertViewHas('holidayCovered', false);
        }
    }

    public function test_invalid_year_is_rejected_without_redirect_or_exception(): void
    {
        foreach (['1899', '2101', '2026.5', 'foo', '', '2026e0', '2026%3Cscript%3E', '%2B2026'] as $year) {
            $this->get('/calendar?year='.$year)->assertStatus(422);
        }
        $this->get('/calendar?year[]=2026')->assertStatus(422);
    }

    public function test_current_year_uses_japanese_time_and_era_changes_show_both_names(): void
    {
        $this->travelTo(now()->setDateTime(2026, 12, 31, 16, 0));
        $this->get('/calendar')->assertOk()->assertViewHas('year', 2027);
        $this->assertSame('2027-01-01', app(YearCalendar::class)->build(2027)['today']);
        $this->get('/calendar?year=1900')->assertSee('今日：')->assertSee('2027年1月1日（金）');
        $this->travelBack();
        $this->get('/calendar?year=2019')->assertOk()->assertSee('平成31年／令和元年');
    }

    public function test_import_rejects_invalid_data_without_changing_files(): void
    {
        $csv = resource_path('calendar/holidays.csv');
        $metadata = resource_path('calendar/holidays-meta.json');
        $before = [hash_file('sha256', $csv), hash_file('sha256', $metadata)];
        $file = tempnam(sys_get_temp_dir(), 'invalid-holidays-');
        try {
            file_put_contents($file, "国民の祝日・休日月日,国民の祝日・休日名称\n2026/2/30,不正\n");
            $this->artisan('calendar:import-holidays', ['file' => $file, '--checked-on' => '2026-11-03'])->assertFailed();
            $this->assertSame($before, [hash_file('sha256', $csv), hash_file('sha256', $metadata)]);
        } finally {
            unlink($file);
        }
    }
}
