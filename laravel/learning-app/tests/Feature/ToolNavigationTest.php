<?php

namespace Tests\Feature;

use Tests\TestCase;

class ToolNavigationTest extends TestCase
{
    public function test_menu_links_to_available_tool_and_keeps_future_tools_unlinked(): void
    {
        $this->get(route('tools.index'))->assertOk()
            ->assertSee('サンプルツール集')
            ->assertSee(route('password.guide'))
            ->assertSee('準備中')->assertDontSee('href="'.url('/calendar').'"', false)
            ->assertDontSee('href="'.url('/login').'"', false);
    }

    public function test_guide_links_to_generator_and_common_menu(): void
    {
        $this->get(route('password.guide'))->assertOk()
            ->assertSee(route('password.form'))->assertSee(route('tools.index'))
            ->assertSee('サーバーで行い');
    }

    public function test_generator_starts_empty_with_documented_defaults(): void
    {
        $this->get(route('password.form'))->assertOk()
            ->assertViewHas('password', null)->assertViewHas('length', '16')
            ->assertViewHas('groups', ['lowercase', 'uppercase', 'numbers'])
            ->assertSee('コピーする')->assertSee(route('tools.index'))
            ->assertDontSee('adsbygoogle')->assertDontSee('fonts.bunny.net')
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    public function test_unimplemented_calendar_does_not_expose_a_placeholder_tool(): void
    {
        $this->get('/calendar')->assertNotFound();
    }
}
