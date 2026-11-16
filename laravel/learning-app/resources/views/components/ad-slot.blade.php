{{-- 対象Routeと広告設定に従い、本番広告またはローカル仮枠を表示する。入力/生成値は受け取らない。 --}}
@php
    // 広告を許すRouteを列挙し、環境とID書式の両方を検証する。
    $allowed = request()->routeIs('tools.index', 'time.tools', 'date.tools', 'unit.converter', 'text.tools', 'password.form', 'password.generate', 'password.browser', 'calendar');
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
            {{-- 複数枠でも広告ローダーは1回だけ出し、各枠の初期化は枠ごとに行う。 --}}
            @once
                <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={{ $client }}" crossorigin="anonymous"></script>
            @endonce
            <ins class="adsbygoogle" style="display:block" data-ad-client="{{ $client }}" data-ad-slot="{{ $slotId }}" data-ad-format="auto" data-full-width-responsive="true"></ins>
            <script>/* この広告枠の初期化を共通キューへ追加する。 */(adsbygoogle = window.adsbygoogle || []).push({});</script>
        @else
            <div class="ad-preview">広告の配置確認用スペース</div>
        @endif
    </aside>
@endif
