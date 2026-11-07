@php
    $measurementId = (string) config('analytics.measurement_id');
    $enabled = request()->routeIs('text.tools') && app()->environment('production')
        && config('analytics.enabled') && preg_match('/\AG-[A-Z0-9]{6,15}\z/', $measurementId);
@endphp
@if($enabled)
    <span hidden data-text-analytics="{{ $measurementId }}"></span>
@endif
