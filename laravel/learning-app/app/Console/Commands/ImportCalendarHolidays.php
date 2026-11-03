<?php

namespace App\Console\Commands;

use DateTimeImmutable;
use Illuminate\Console\Command;
use RuntimeException;

class ImportCalendarHolidays extends Command
{
    protected $signature = 'calendar:import-holidays {file : 内閣府CSVのローカルファイル} {--checked-on= : 確認日（YYYY-MM-DD）}';

    protected $description = '取得済みの内閣府CSVを検証しUTF-8祝日テキストへ変換（外部通信なし）';

    public function handle(): int
    {
        try {
            $checkedOn = $this->option('checked-on');
            $checkedDate = is_string($checkedOn) ? DateTimeImmutable::createFromFormat('!Y-m-d', $checkedOn) : false;
            if (! $checkedDate || $checkedDate->format('Y-m-d') !== $checkedOn) {
                throw new RuntimeException('--checked-onに実際の確認日をYYYY-MM-DD形式で指定してください。');
            }
            $path = $this->argument('file');
            if (! is_file($path) || ! is_readable($path)) {
                throw new RuntimeException('読み取れるローカルCSVを指定してください。');
            }
            $source = file_get_contents($path);
            $encoding = mb_check_encoding($source, 'UTF-8') ? 'UTF-8' : 'SJIS-win';
            $text = mb_convert_encoding($source, 'UTF-8', $encoding);
            $stream = fopen('php://temp', 'w+');
            fwrite($stream, $text);
            rewind($stream);
            $header = fgetcsv($stream, escape: '');
            if ($header !== ['国民の祝日・休日月日', '国民の祝日・休日名称']) {
                throw new RuntimeException('内閣府CSVのヘッダーが一致しません。元データを確認してください。');
            }
            $dates = [];
            while (($row = fgetcsv($stream, escape: '')) !== false) {
                if ($row === [null]) {
                    continue;
                }
                if (count($row) !== 2 || ! preg_match('~\A([0-9]{4})/([0-9]{1,2})/([0-9]{1,2})\z~', $row[0], $parts)) {
                    throw new RuntimeException('不正な行があります。更新しません。');
                }
                [$year, $month, $day] = array_map('intval', array_slice($parts, 1));
                $date = sprintf('%04d-%02d-%02d', $year, $month, $day);
                if (! checkdate($month, $day, $year) || isset($dates[$date]) || trim($row[1]) === '') {
                    throw new RuntimeException('日付・名称の不正または日付の重複があります。');
                }
                $dates[$date] = $row[1];
            }
            fclose($stream);
            ksort($dates);
            $firstYear = (int) substr(array_key_first($dates) ?? '', 0, 4);
            $lastYear = (int) substr(array_key_last($dates) ?? '', 0, 4);
            $existing = json_decode(file_get_contents(resource_path('calendar/holidays-meta.json')), true, flags: JSON_THROW_ON_ERROR);
            if ($firstYear !== $existing['first_year'] || $lastYear < $existing['last_year']) {
                throw new RuntimeException('収録年が縮小します。取得内容を確認してください。');
            }
            for ($year = $firstYear; $year <= $lastYear; $year++) {
                $entries = array_filter($dates, fn (string $key): bool => str_starts_with($key, $year.'-'), ARRAY_FILTER_USE_KEY);
                if (count($entries) < 9 || ! isset($entries[$year.'-01-01']) || ! isset($entries[$year.'-11-23'])) {
                    throw new RuntimeException('年の欠落や不完全な年の可能性があります。更新しません。');
                }
            }
            $output = fopen('php://temp', 'w+');
            fputcsv($output, ['date', 'name'], escape: '', eol: "\n");
            foreach ($dates as $date => $name) {
                fputcsv($output, [$date, $name], escape: '', eol: "\n");
            }
            rewind($output);
            $csv = stream_get_contents($output);
            fclose($output);
            $metadata = [
                'source' => 'https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv',
                'checked_on' => $checkedOn, 'first_year' => $firstYear, 'last_year' => $lastYear,
                'source_sha256' => hash('sha256', $source),
            ];
            file_put_contents(resource_path('calendar/holidays.csv'), $csv, LOCK_EX);
            file_put_contents(resource_path('calendar/holidays-meta.json'), json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n", LOCK_EX);
            $this->info(count($dates).'件を変換しました（'.$firstYear.'〜'.$lastYear.'年）。差分を確認してから配置してください。');

            return self::SUCCESS;
        } catch (\Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
