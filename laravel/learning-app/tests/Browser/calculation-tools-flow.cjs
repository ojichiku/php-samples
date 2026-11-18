/** @file 日常計算Laravel画面の入出力・端数・再計算・4幅をローカルで検証し、JSONだけ保存する。 */

const path = require('node:path');
const fs = require('node:fs');

const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({ headless: true });
 const page = await browser.newPage();
 const checks = [], errors = [], external = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.hostname !== '127.0.0.1') { external.push(url.origin); return route.abort(); }
  return route.continue();
 });
 /**
  * 検証結果を記録する。
  * @param {string} name 検査名。
  * @param {boolean} passed 成功条件。
  * @returns {void}
  * @throws {Error} 条件がfalseの場合。
  */
 function ok(name, passed) { checks.push({ name, passed }); if (!passed) throw Error(name); }
 /**
  * 用途を開き、指定入力を埋めて送信する。
  * @param {string} mode 用途ID。
  * @param {Object<string,string>} values 入力IDと値。
  * @returns {Promise<string>} 結果のテキスト。
  */
 async function calculate(mode, values) {
  await page.locator(`#${mode}-tab`).click();
  for (const [id, value] of Object.entries(values)) await page.locator(`#${id}`).fill(value);
  await page.locator(`#${mode}-form button[type=submit]`).click();
  return page.locator(`#${mode}-result`).innerText();
 }
 await page.goto(new URL('/calculation-tools', process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8003').href);
 ok('initial inputs empty', await page.locator('input').evaluateAll(nodes => nodes.every(node => node.value === '')));
 ok('ratio 800 and 200', (await calculate('ratio', { 'ratio-whole': '800', 'ratio-part': '200' })).includes('25%'));
 await page.locator('#ratio-part').fill('100');
 ok('editing hides old result', await page.locator('#ratio-result').isHidden());
 await page.locator('#ratio-part').press('Enter');
 ok('Enter recalculates and retains input', (await page.locator('#ratio-result').innerText()).includes('12.5%') && await page.locator('#ratio-part').inputValue() === '100');
 ok('fraction rounding is labelled', (await calculate('ratio', { 'ratio-whole': '3', 'ratio-part': '1' })).includes('約33.3333%'));
 await calculate('ratio', { 'ratio-whole': '0', 'ratio-part': '1' });
 ok('zero denominator error focuses whole', (await page.locator('#ratio-error').innerText()).includes('0より大きい') && await page.locator('#ratio-whole').evaluate(node => node === document.activeElement));
 await page.locator('#ratio-kind').selectOption('amount');
 ok('meaning change clears part field', await page.locator('#ratio-part').inputValue() === '');
 const amount = await calculate('ratio', { 'ratio-whole': '800', 'ratio-part': '25' });
 ok('amount 25 percent of 800', amount.includes('200'));
 ok('amount formula applies percentage once', amount.includes('800 × 25 ÷ 100') && !amount.includes('25% ÷ 100'));
 ok('amount hint includes rate upper limit', (await page.locator('#ratio-note').innerText()).includes('1,000,000%'));
 await calculate('ratio', { 'ratio-whole': '1000000000', 'ratio-part': '25' });
 ok('decimal limit message matches accepted maximum', (await page.locator('#ratio-error').innerText()).includes('999,999,999.9999'));
 ok('accepted decimal maximum', (await calculate('ratio', { 'ratio-whole': '999999999.9999', 'ratio-part': '100' })).includes('999,999,999.9999'));
 ok('exact decimal multiplication', (await calculate('ratio', { 'ratio-whole': '0.1', 'ratio-part': '20' })).includes('0.02'));
 ok('discount example', (await calculate('discount', { 'discount-price': '1980', 'discount-rate': '15' })).includes('1,683円'));
 const discounted = await calculate('discount', { 'discount-price': '101', 'discount-rate': '15' });
 ok('discount truncation and sum shown', discounted.includes('86円') && discounted.includes('割引額：15円'));
 ok('discount 100 percent', (await calculate('discount', { 'discount-price': '101', 'discount-rate': '100' })).includes('0円'));
 await calculate('discount', { 'discount-price': '101', 'discount-rate': '100.01' });
 ok('discount over 100 rejected', (await page.locator('#discount-error').innerText()).includes('100以下') && await page.locator('#discount-result').isHidden());
 await calculate('discount', { 'discount-price': '1.1', 'discount-rate': '15' });
 ok('fractional yen rejected', (await page.locator('#discount-error').innerText()).includes('整数'));
 ok('increase example', (await calculate('change', { 'change-before': '800', 'change-after': '1000' })).includes('25% 増'));
 ok('decrease baseline', (await calculate('change', { 'change-before': '1000', 'change-after': '800' })).includes('20% 減'));
 ok('same value', (await calculate('change', { 'change-before': '800', 'change-after': '800' })).includes('0%（増減なし）'));
 ok('decrease to zero', (await calculate('change', { 'change-before': '800', 'change-after': '0' })).includes('100% 減'));
 const split = await calculate('split', { 'split-total': '1000', 'split-people': '3' });
 ok('split remainder and sum', split.includes('333円') && split.includes('残り：1円') && split.includes('333円 × 3人 ＋ 1円 ＝ 1,000円'));
 ok('split exact', (await calculate('split', { 'split-total': '1000', 'split-people': '4' })).includes('残り：0円'));
 await calculate('split', { 'split-total': '1000', 'split-people': '0' });
 ok('zero people rejected', (await page.locator('#split-error').innerText()).includes('0より大きい'));
 await calculate('split', { 'split-total': '1000', 'split-people': '1000' });
 ok('people upper limit rejected', (await page.locator('#split-error').innerText()).includes('999以下'));
 await calculate('split', { 'split-total': '1000', 'split-people': '3.5' });
 ok('fractional people rejected', (await page.locator('#split-error').innerText()).includes('整数'));
 for (const [input, name] of [['-1','negative'], ['1e3','exponent'], ['1,000','comma'], ['1000000000','overflow'], ['1.12345','precision'], ['', 'empty']]) {
  await calculate('change', { 'change-before': input, 'change-after': '1' });
  ok(`${name} rejected`, (await page.locator('#change-error').innerText()).length > 0 && await page.locator('#change-result').isHidden());
 }
 ok('fullwidth normalized', (await calculate('change', { 'change-before': '８００', 'change-after': '１０００' })).includes('25% 増'));
 await page.locator('#ratio-tab').click(); await page.locator('#change-tab').click();
 ok('mode switching preserves input', await page.locator('#change-before').inputValue() === '８００');
 await page.locator('#ratio-tab').focus(); await page.keyboard.press('ArrowRight');
 ok('keyboard tab switch', await page.locator('#discount-tab').getAttribute('aria-selected') === 'true' && await page.locator('#discount-tab').evaluate(node => node === document.activeElement));
 for (const width of [320,375,768,1280]) {
  await page.setViewportSize({ width, height: 900 });
  for (const mode of ['ratio','discount','change','split']) {
   await page.locator(`#${mode}-tab`).click();
   ok(`${width}px ${mode} no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   ok(`${width}px ${mode} minimum controls`, await page.locator(`#${mode}-panel input, #${mode}-panel button`).evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44)));
  }
 }
 ok('no JavaScript errors', errors.length === 0); ok('no external requests', external.length === 0);
 ok('no persistent input storage', await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0));
 await page.reload(); ok('reload clears inputs', await page.locator('input').evaluateAll(nodes => nodes.every(node => node.value === '')));
 const noJs = await browser.newPage({ javaScriptEnabled: false }); await noJs.goto(page.url());
 ok('no JavaScript leaves calculation disabled', await noJs.locator('#ratio-form button').isDisabled());
 const result = { passed: checks.length, checks, errors, external, screenshots: false };
 fs.mkdirSync(path.resolve(__dirname, '../../test-results'), { recursive: true });
 fs.writeFileSync(path.resolve(__dirname, '../../test-results/calculation-tools-verification.json'), JSON.stringify(result, null, 2)+'\n');
 await browser.close(); console.log(JSON.stringify({ passed: checks.length, errors, external }));
})().catch(error => { console.error(error); process.exit(1); });
