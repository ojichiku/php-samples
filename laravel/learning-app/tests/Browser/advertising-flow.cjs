const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
(async () => {
    const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
    if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local preview only');
    const output = path.resolve(__dirname, '../../test-results/browser/advertising');
    fs.mkdirSync(output, {recursive: true});
    const browser = await chromium.launch({headless: true});
    const results = [];
    try {
        for (const width of [320, 375, 768, 1280]) {
            const page = await browser.newPage({viewport: {width, height: 900}});
            const errors = [], external = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.route('**/*', route => {
                if (new URL(route.request().url()).origin !== new URL(base).origin) {
                    external.push(route.request().url());
                    return route.abort();
                }
                return route.continue();
            });
            for (const [name, url] of [['index', '/'], ['guide', '/password-generator'], ['browser-guide', '/password-generator-browser/guide'], ['calendar', '/calendar']]) {
                assert.equal((await page.goto(base + url)).status(), 200);
                await page.locator('.ad-preview').first().waitFor();
                assert.equal(await page.locator('.ad-slot').count(), name === 'index' ? 2 : 1);
                if (name === 'index') {
                    assert.ok(await page.evaluate(() => {
                        const ads = document.querySelectorAll('.ad-slot');
                        const tools = document.querySelector('[aria-labelledby="tools-heading"]');
                        return document.querySelector('.hero').getBoundingClientRect().bottom <= ads[0].getBoundingClientRect().top
                            && ads[0].getBoundingClientRect().bottom <= tools.getBoundingClientRect().top
                            && tools.getBoundingClientRect().bottom <= ads[1].getBoundingClientRect().top;
                    }));
                }
                assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
                if (name === 'calendar') {
                    assert.ok(await page.evaluate(() => document.querySelector('.year-grid').getBoundingClientRect().bottom <= document.querySelector('.ad-slot').getBoundingClientRect().top));
                }
                await page.screenshot({path: path.join(output, `${name}-${width}.png`), fullPage: true});
                await page.emulateMedia({media: 'print'});
                assert.equal(await page.locator('.ad-slot').first().evaluate(el => getComputedStyle(el).display), 'none');
                await page.emulateMedia({media: 'screen'});
            }
            await page.goto(base + '/password-generator-browser/guide');
            await page.getByRole('link', {name: 'ブラウザーで生成する'}).click();
            assert.equal(new URL(page.url()).pathname, new URL(base + '/password-generator-browser').pathname);
            assert.equal(await page.locator('.ad-slot').count(), 2);
            assert.equal(await page.locator('.ad-preview').count(), 2);
            assert.ok(await page.evaluate(() => document.querySelector('.ad-slot').getBoundingClientRect().bottom <= document.querySelector('#browser-password-tool').getBoundingClientRect().top));
            await page.goto(base + '/password-generator/generate');
            assert.equal(await page.locator('.ad-slot, .adsbygoogle').count(), 0);
            assert.deepEqual(external, []);
            assert.deepEqual(errors, []);
            results.push({width, pages: 4, noOverflow: true, noExternalRequests: true, printHidden: true, browserGeneratorAdSlots: 2, serverGeneratorExcluded: true});
            await page.close();
        }
        fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(results, null, 2));
        console.log(JSON.stringify(results));
    } finally {await browser.close();}
})().catch(error => {console.error(error); process.exit(1);});
