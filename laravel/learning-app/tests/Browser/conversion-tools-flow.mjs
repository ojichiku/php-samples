/** @file 共通の入口から変換3画面を開き、結果・エラー・コピー・保存を確認する。 */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = new URL(process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8000');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname) || process.env.ALLOW_REMOTE_TESTS === '1');
const local = ['127.0.0.1', 'localhost'].includes(base.hostname);
const artifacts = process.env.TEST_ARTIFACT_DIR;
if (artifacts) await mkdir(artifacts, { recursive: true });

/** @param {import('playwright').Page} page 基数変換を開いたページ。 */
async function checkRadix(page) {
    const input = page.locator('#radix-integer');
    const copy = page.locator('#radix-copy');
    assert(await copy.isDisabled());
    await input.fill('255');
    assert.equal(await page.locator('#radix-result').textContent(), 'FF');
    await page.locator('#radix-output-base').selectOption('custom');
    assert(await copy.isDisabled());
    await page.locator('#radix-output-custom').fill('3');
    assert.equal(await page.locator('#radix-result').textContent(), '100110');
    await copy.click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '100110');
    await page.locator('#radix-input-base').selectOption('2');
    await input.fill('102');
    assert(await copy.isDisabled());
    assert.equal(await page.locator('#radix-result').textContent(), '');
    await page.locator('#radix-input-base').selectOption('10');
    await input.fill('255');
}

/** @param {import('playwright').Page} page 文字コード・改行変換を開いたページ。 */
async function checkEncoding(page) {
    const input = page.locator('#encoding-file');
    const save = page.locator('#encoding-download');
    assert(await save.isDisabled());
    await input.setInputFiles({ name: 'mixed.txt', mimeType: 'text/plain', buffer: Buffer.from('東京\r\n大阪\n') });
    await page.locator('#encoding-target').selectOption('utf8-bom');
    const pending = page.waitForEvent('download');
    await save.click();
    const download = await pending;
    assert.equal(download.suggestedFilename(), 'mixed-converted.txt');
    assert.deepEqual(await readFile(await download.path()), Buffer.from('\uFEFF東京\n大阪\n'));
    const cp932 = Buffer.from([0x93, 0x8C, 0x8B, 0x9E, 0x0D, 0x0A]);
    await input.setInputFiles({ name: 'tokyo.txt', mimeType: 'text/plain', buffer: cp932 });
    await page.locator('#encoding-source-error').waitFor();
    assert(await save.isDisabled());
    await page.locator('#encoding-source').selectOption('cp932');
    await page.locator('#encoding-target').selectOption('cp932');
    await page.locator('#encoding-newline').selectOption('crlf');
    const cp932Pending = page.waitForEvent('download');
    await save.click();
    assert.deepEqual(await readFile(await (await cp932Pending).path()), cp932);
    await page.locator('#encoding-source').selectOption('utf8');
    const manualGuide = await readFile(new URL('../fixtures/excel-to-csv/確認手順.txt', import.meta.url));
    await input.setInputFiles({ name: '確認手順.txt', mimeType: 'text/plain', buffer: manualGuide });
    const issues = page.locator('#encoding-target-issues');
    await issues.waitFor();
    const issueText = await issues.innerText();
    assert.match(issueText, /U\+2014.*U\+2015.*6箇所/);
    for (const lineNumber of [1, 4, 17, 22, 28, 31]) {
        assert.match(issueText, new RegExp(`(?:^|[、\\n])${lineNumber}行\\d+文字目`));
    }
    assert.equal(await save.innerText(), '表示のとおり置換してダウンロード');
    const originalPreview = await page.locator('#encoding-preview').textContent();
    assert.match(originalPreview, /—/);
    const width = page.viewportSize().width;
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    if (artifacts && width !== 320) {
        await page.screenshot({ path: `${artifacts}/character-encoding-cp932-${width}.png`, fullPage: true });
        if (width === 390) {
            const field = await page.locator('label[for="encoding-target"]').boundingBox();
            const button = await save.boundingBox();
            const scrollY = await page.evaluate(() => window.scrollY);
            const top = Math.floor(field.y + scrollY - 8);
            await page.screenshot({
                path: `${artifacts}/character-encoding-cp932-operations.png`,
                fullPage: true,
                clip: { x: 8, y: top, width: width - 16, height: Math.ceil(button.y + scrollY + button.height + 8 - top) },
            });
        }
    }
    const replacedPending = page.waitForEvent('download');
    await save.click();
    const replacedDownload = await replacedPending;
    assert.equal(replacedDownload.suggestedFilename(), '確認手順-converted.txt');
    const replacedBytes = await readFile(await replacedDownload.path());
    const replacedText = new TextDecoder('shift_jis', { fatal: true }).decode(replacedBytes);
    assert.equal(replacedText, manualGuide.toString('utf8').replaceAll('—', '―').replace(/\r\n|\n|\r/g, '\r\n'));
    assert.equal(await page.locator('#encoding-preview').textContent(), originalPreview);

    await input.setInputFiles({ name: 'emoji.txt', mimeType: 'text/plain', buffer: Buffer.from('東京—🍵') });
    await page.locator('#encoding-target-error').waitFor();
    assert.match(await issues.innerText(), /U\+1F375.*置換候補なし/);
    assert(await save.isDisabled());

    const manyIssues = '—'.repeat(13) + Array.from({ length: 13 }, (_, index) => String.fromCodePoint(0x1F340 + index)).join('');
    await input.setInputFiles({ name: 'many.txt', mimeType: 'text/plain', buffer: Buffer.from(manyIssues) });
    const omitted = page.locator('#encoding-target-omitted');
    await omitted.waitFor();
    assert.match(await page.locator('#encoding-target-error').innerText(), /26件/);
    assert.match(await issues.locator('li').first().innerText(), /ほか1箇所/);
    assert.match(await omitted.innerText(), /ほかに2箇所/);
    assert(await save.isDisabled());

    await page.locator('#encoding-target').selectOption('utf8');
    assert.equal(await issues.isVisible(), false);
    assert.equal(await omitted.isVisible(), false);
    assert.equal(await save.innerText(), 'ダウンロード');
    assert(await save.isEnabled());
    await page.locator('#encoding-newline').selectOption('lf');
    await input.setInputFiles({ name: 'mixed.txt', mimeType: 'text/plain', buffer: Buffer.from('東京\r\n大阪\n') });
    await save.waitFor();
    await page.waitForFunction(() => !document.querySelector('#encoding-download').disabled);
    assert.match(await page.locator('#encoding-preview').textContent(), /東京\r?\n大阪/);
}

/** @param {import('playwright').Page} page 色コード変換を開いたページ。 */
async function checkColor(page) {
    const input = page.locator('#color-input');
    const copyHex = page.locator('#color-copy-hex');
    const copyRgb = page.locator('#color-copy-rgb');
    assert(await copyHex.isDisabled());
    await input.fill('#369');
    assert.equal(await page.locator('#color-hex').textContent(), '#336699');
    assert.equal(await page.locator('#color-rgb').textContent(), 'rgb(51, 102, 153)');
    assert.equal(await page.locator('#color-swatch').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(51, 102, 153)');
    await copyHex.click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '#336699');
    await copyRgb.click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'rgb(51, 102, 153)');
    await input.fill('rgb(256, 0, 0)');
    assert(await page.locator('#color-error').isVisible());
    assert(await copyHex.isDisabled());
    assert(await copyRgb.isDisabled());
    await input.fill('#369');
}

const tools = [
    { menu: '基数変換', card: '基数を変換する', path: 'radix-converter', check: checkRadix },
    { menu: '文字コード・改行', card: '文字コード・改行を変換する', path: 'character-encoding', check: checkEncoding },
    { menu: '色コード変換', card: '色コードを変換する', path: 'color-code', check: checkColor },
];

const browser = await chromium.launch();
try {
    for (const width of [320, 390, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
        const errors = [];
        const outbound = [];
        const requests = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => {
            if (/^https?:/.test(request.url())) requests.push(request.url());
        });
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin === base.origin) return route.continue();
            if (local) outbound.push(url.href);
            return route.abort();
        });
        assert.equal((await page.goto(base.href)).status(), 200);
        assert.equal(await page.locator('.tool-card.available').count(), 17);
        if (artifacts && width !== 320) await page.screenshot({ path: `${artifacts}/menu-${width}.png`, fullPage: true });
        for (const tool of tools) {
            await page.getByRole('navigation').getByRole('link', { name: tool.menu, exact: true }).click();
            await page.waitForURL(`**/${tool.path}`);
            assert.equal(await page.locator('nav [aria-current=page]').innerText(), tool.menu);
            await page.getByRole('link', { name: '← ツール一覧', exact: true }).click();
            await page.getByRole('link', { name: tool.card, exact: true }).click();
            await page.waitForURL(`**/${tool.path}`);
            await page.waitForLoadState('networkidle');
            assert.equal(await page.locator(local ? 'main .ad-preview' : 'main .ad-slot').count(), 2);
            requests.length = 0;
            await tool.check(page);
            assert.deepEqual(requests, []);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
            if (artifacts && width !== 320) {
                await page.screenshot({ path: `${artifacts}/${tool.path}-${width}.png`, fullPage: true });
                if (width === 390) {
                    await page.locator('main section[aria-label]').screenshot({ path: `${artifacts}/${tool.path}-operations.png` });
                }
            }
            await page.getByRole('link', { name: 'ツール一覧に戻る', exact: true }).click();
            await page.waitForURL(base.href);
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(outbound, []);
        await page.close();
        console.log(`変換ツール3画面: ${width}pxで成功`);
    }
} finally {
    await browser.close();
}
