<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

class YearCalendar
{
    public const MIN_YEAR = 1900;

    public const MAX_YEAR = 2100;

    public function __construct(private ?string $dataDirectory = null)
    {
        $this->dataDirectory ??= resource_path('calendar');
    }

    /** @return array<string, mixed> */
    public function build(int $year): array
    {
        if ($year < self::MIN_YEAR || $year > self::MAX_YEAR) {
            throw new InvalidArgumentException('対応範囲外の年です。');
        }
        $holidays = $this->holidays();
        $metadata = json_decode(file_get_contents($this->dataDirectory.'/holidays-meta.json'), true, flags: JSON_THROW_ON_ERROR);
        $anniversaries = $this->anniversaries($year);
        $rokuyo = $this->rokuyo($year);
        $today = CarbonImmutable::now('Asia/Tokyo')->format('Y-m-d');
        $months = [];
        for ($month = 1; $month <= 12; $month++) {
            $first = new DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month), new DateTimeZone('Asia/Tokyo'));
            $cells = array_fill(0, (int) $first->format('w'), null);
            for ($day = 1; $day <= (int) $first->format('t'); $day++) {
                $date = $first->setDate($year, $month, $day);
                $key = $date->format('Y-m-d');
                $cells[] = [
                    'date' => $key, 'day' => $day, 'weekday' => (int) $date->format('w'),
                    'holiday' => $holidays[$key] ?? null,
                    'rokuyo' => $rokuyo[$key] ?? null,
                    'anniversaries' => $anniversaries[$date->format('m-d')] ?? [],
                    'today' => $key === $today,
                ];
            }
            $months[] = ['number' => $month, 'weeks' => array_chunk(array_pad($cells, 42, null), 7)];
        }
        $yearHolidays = array_filter($holidays, fn (string $date): bool => str_starts_with($date, $year.'-'), ARRAY_FILTER_USE_KEY);

        return [
            'year' => $year, 'era' => $this->eraLabel($year), 'months' => $months,
            'today' => $today,
            'todayLabel' => (new DateTimeImmutable($today))->format('Y年n月j日').'（'.['日', '月', '火', '水', '木', '金', '土'][(int) (new DateTimeImmutable($today))->format('w')].'）',
            'holidays' => $yearHolidays, 'holidayMetadata' => $metadata,
            'holidayCovered' => $year >= $metadata['first_year'] && $year <= $metadata['last_year'],
            'rokuyoCovered' => count($rokuyo) === (int) (new DateTimeImmutable($year.'-12-31'))->format('z') + 1,
            'currentYear' => (int) substr($today, 0, 4),
            'minYear' => self::MIN_YEAR, 'maxYear' => self::MAX_YEAR,
        ];
    }

    public function eraLabel(int $year): string
    {
        $eras = [
            ['name' => '明治', 'start' => 1868, 'end' => 1912],
            ['name' => '大正', 'start' => 1912, 'end' => 1926],
            ['name' => '昭和', 'start' => 1926, 'end' => 1989],
            ['name' => '平成', 'start' => 1989, 'end' => 2019],
            ['name' => '令和', 'start' => 2019, 'end' => self::MAX_YEAR],
        ];
        $labels = [];
        foreach ($eras as $era) {
            if ($year >= $era['start'] && $year <= $era['end']) {
                $number = $year - $era['start'] + 1;
                $labels[] = $era['name'].($number === 1 ? '元' : $number).'年';
            }
        }

        return implode('／', $labels);
    }

    /** @return array<string, string> */
    private function holidays(): array
    {
        $rows = $this->csv('holidays.csv');
        $dates = [];
        foreach ($rows as $row) {
            $dates[$row['date']] = $row['name'];
        }
        ksort($dates);

        return $dates;
    }

    /** @return array<string, list<array{name: string, source: string}>> */
    private function anniversaries(int $year): array
    {
        $dates = [];
        foreach ($this->csv('anniversaries.csv') as $row) {
            if ($year >= (int) $row['start_year']) {
                $dates[$row['month_day']][] = ['name' => $row['name'], 'source' => $row['source']];
            }
        }

        return $dates;
    }

    /** @return list<array<string, string>> */
    private function csv(string $filename): array
    {
        $file = fopen($this->dataDirectory.'/'.$filename, 'r');
        try {
            $header = fgetcsv($file, escape: '');
            $rows = [];
            while (($row = fgetcsv($file, escape: '')) !== false) {
                if ($row !== [null]) {
                    $rows[] = array_combine($header, $row);
                }
            }

            return $rows;
        } finally {
            fclose($file);
        }
    }

    /**
     * Convert the licensed Japanese lunar-month table to rokuyo; leap months keep their month number.
     * Dates outside the table are deliberately absent rather than extrapolated.
     *
     * @return array<string, string>
     */
    private function rokuyo(int $year): array
    {
        $table = json_decode(file_get_contents($this->dataDirectory.'/kyureki.json'), true, flags: JSON_THROW_ON_ERROR);
        $names = ['大安', '赤口', '先勝', '友引', '先負', '仏滅'];
        $dates = [];
        foreach ($table['years'] as $lunarYear) {
            $startYear = (int) substr($lunarYear['start'], 0, 4);
            if ($startYear < $year - 1 || $startYear > $year) {
                continue;
            }
            $date = new DateTimeImmutable($lunarYear['start'], new DateTimeZone('Asia/Tokyo'));
            $month = 1;
            foreach (str_split($lunarYear['sizeInfo']) as $index => $size) {
                $isLeap = $lunarYear['leapMonth'] >= 0 && $index === $lunarYear['leapMonth'] + 1;
                if ($index > 0 && ! $isLeap) {
                    $month++;
                }
                for ($day = 1; $day <= 29 + (int) $size; $day++) {
                    if ((int) $date->format('Y') === $year) {
                        $dates[$date->format('Y-m-d')] = $names[($month + $day) % 6];
                    }
                    $date = $date->modify('+1 day');
                }
            }
        }

        return $dates;
    }
}
