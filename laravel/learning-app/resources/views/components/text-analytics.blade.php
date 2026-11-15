{{-- 本番のtext.toolsだけに、形式検証した解析IDをマーカーとして出す。JS側がマーカーを見て解析を初期化する。 --}}
@php
    $measurementId = (string) config('analytics.measurement_id');
    $enabled = request()->routeIs('text.tools') && app()->environment('production')
        && config('analytics.enabled') && preg_match('/\AG-[A-Z0-9]{6,15}\z/', $measurementId);
@endphp
@if($enabled)
    <span hidden data-text-analytics="{{ $measurementId }}"></span>
@endif
