const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
(async () => {
    const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
    if (!origin.startsWith('http://127.0.0.1:') && process.env.ALLOW_REMOTE_TESTS !== '1') throw new Error('Remote tests require ALLOW_REMOTE_TESTS=1');
    const output = process.env.TEST_ARTIFACT_DIR || path.resolve(__dirname, '../../test-results/browser/calendar');
    fs.mkdirSync(output, {recursive: true});
    const browser = await chromium.launch({headless: true});
    const rows = [];
    try {
        for (const width of [320, 375, 768, 1280]) {
            const page = await browser.newPage({viewport: {width, height: 900}});
            const errors = [];
            const external = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('request', request => {if (!request.url().startsWith(origin)) external.push(request.url());});
            const response = await page.goto(`${origin}/calendar?year=2026`);
            assert.equal(response.status(), 200);
            assert.equal(await page.locator('.month-card').count(), 12);
            const columns = await page.locator('.year-grid').evaluate(grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
            assert.equal(columns, width <= 1000 ? 1 : 3);
            assert.equal(await page.locator('[data-date="2026-09-22"] .day-holiday').innerText(), '休日');
            assert.equal(await page.locator('.day-details').count(), 0);
            await page.locator('#calendar-year').fill('2000');
            await Promise.all([page.waitForNavigation(), page.getByRole('button', {name: '表示', exact: true}).click()]);
            assert.equal(await page.locator('[data-date="2000-02-29"]').count(), 1);
            await page.getByRole('link', {name: '翌年 →'}).click();
            assert.match(page.url(), /year=2001/);
            await page.goto(`${origin}/calendar?year=1900`);
            assert.equal(await page.locator('[data-date="1900-02-29"]').count(), 0);
            assert.equal(await page.getByRole('link', {name: '← 前年', exact: true}).count(), 0);
            assert.match(await page.locator('.calendar-warning').first().innerText(), /未収録/);
            await page.goto(`${origin}/calendar?year=2100`);
            assert.equal(await page.getByRole('link', {name: '翌年 →'}).count(), 0);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.getByRole('link', {name: '今日', exact: true}).click();
            const today = page.locator('[aria-current="date"]');
            assert.equal(await today.count(), 1);
            assert.equal(new URL(page.url()).hash, `#${await today.getAttribute('id')}`);
            const todayBounds = await today.boundingBox();
            assert.ok(todayBounds.y >= 0 && todayBounds.y < 900, 'today must scroll into view');
            await page.goto(`${origin}/calendar?year=2026`);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({path: `${output}/calendar-${width}.png`, fullPage: true});
            assert.deepEqual(errors, []);
            assert.deepEqual(external, []);
            rows.push({width, columns, yearNavigation: 'passed', holidays: 'passed', anniversaryRemoved: 'passed', leapYears: 'passed', boundaryYears: 'passed', horizontalOverflow: false, javascriptErrors: 0, externalRequests: 0});
            await page.close();
        }
        fs.writeFileSync(`${output}/results.json`, JSON.stringify(rows, null, 2) + '\n');
        console.log(JSON.stringify(rows));
    } finally {await browser.close();}
})().catch(error => {console.error(error); process.exit(1);});
