<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

/** ローカルの祝日CSV/旧暦JSONを読み、年間カレンダーのBladeへ渡すデータを組み立てる。 */
class YearCalendar
{
    public const MIN_YEAR = 1900;

    public const MAX_YEAR = 2100;

    /**
     * 暦データの参照ディレクトリを設定する。
     *
     * @param  string|null  $dataDirectory  祝日/旧暦ファイルのあるディレクトリ。nullならresources/calendar。
     */
    public function __construct(private ?string $dataDirectory = null)
    {
        $this->dataDirectory ??= resource_path('calendar');
    }

    /**
     * 12か月の6週分のセル、収録状態、日本時間の今日を返す。
     *
     * @param  int  $year  表示する西暦年（1900〜2100、単位：年）。
     * @return array<string, mixed> year/era、months（月番号と6週×7列のweeks）、today/todayLabel、holidays/holidayMetadata、収録状態、現在年と範囲。日セルはdate/day/weekday/holiday/rokuyo/todayを持ち、月外はnull。
     *
     * @throws InvalidArgumentException 年が対応範囲外の場合。
     * @throws \JsonException ローカルの暦JSONを解析できない場合。
     */
    public function build(int $year): array
    {
        if ($year < self::MIN_YEAR || $year > self::MAX_YEAR) {
            throw new InvalidArgumentException('対応範囲外の年です。');
        }
        $holidays = $this->holidays();
        $metadata = json_decode(file_get_contents($this->dataDirectory.'/holidays-meta.json'), true, flags: JSON_THROW_ON_ERROR);
        $rokuyo = $this->rokuyo($year);
        $today = CarbonImmutable::now('Asia/Tokyo')->format('Y-m-d');
        $months = [];
        // 月初の曜日分を空セルにし、月末も埋めて各月を6週×7列の同じ高さにする。
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

    /**
     * 年に重なる元号をすべて表示し、改元年は区切りで連結する。
     *
     * @param  int  $year  西暦年（通常はbuildで検証した1900〜2100）。
     * @return string 元号名と元号年。定義された期間外で該当しなければ空文字。
     */
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

    /**
     * 収録済みの祝日CSVを日付順の辞書へ変換する。
     *
     * @return array<string, string> YYYY-MM-DDをキー、祝日/休日名を値とする配列。
     */
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

    /**
     * ヘッダー付きローカルCSVを読み、空行を除いて返す。
     *
     * @param  string  $filename  暦ディレクトリ内のCSVファイル名。入力元の検証済みデータを前提とする。
     * @return list<array<string, string>> ヘッダー名をキーにした各行。ファイルはfinallyで閉じる。
     */
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
     * ライセンス付き旧暦月表を六曜へ変換する。閏月は元の月番号を維持する。
     *
     * @param  int  $year  抽出する西暦年（単位：年）。
     * @return array<string, string> YYYY-MM-DDに対応する六曜。表の収録範囲外は推測で補わない。
     *
     * @throws \JsonException 旧暦JSONを解析できない場合。
     */
    private function rokuyo(int $year): array
    {
        $table = json_decode(file_get_contents($this->dataDirectory.'/kyureki.json'), true, flags: JSON_THROW_ON_ERROR);
        // 旧暦の月番号と日を足した余りを、六曜の並びに対応させる。
        $names = ['大安', '赤口', '先勝', '友引', '先負', '仏滅'];
        $dates = [];
        foreach ($table['years'] as $lunarYear) {
            $startYear = (int) substr($lunarYear['start'], 0, 4);
            // 旧暦年は西暦年をまたぐため、前年開始の旧暦年も読む。
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
