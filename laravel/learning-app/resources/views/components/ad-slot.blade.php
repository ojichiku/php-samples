@php
    $allowed = request()->routeIs('tools.index', 'text.tools', 'password.guide', 'password.browser.guide', 'calendar');
    $client = (string) config('advertising.client');
    $slotId = (string) config('advertising.slot');
    $live = $allowed && app()->environment('production') && config('advertising.enabled')
        && preg_match('/\Aca-pub-[0-9]{16}\z/', $client) && preg_match('/\A[0-9]+\z/', $slotId);
    $preview = $allowed && ! app()->environment('production') && config('advertising.preview');
@endphp
@if($live || $preview)
    <aside class="ad-slot" aria-label="広告">
        <p class="ad-label">広告</p>
        @if($live)
            @once
                <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={{ $client }}" crossorigin="anonymous"></script>
            @endonce
            <ins class="adsbygoogle" style="display:block" data-ad-client="{{ $client }}" data-ad-slot="{{ $slotId }}" data-ad-format="auto" data-full-width-responsive="true"></ins>
            <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
        @else
            <div class="ad-preview">広告の配置確認用スペース</div>
        @endif
    </aside>
@endif
