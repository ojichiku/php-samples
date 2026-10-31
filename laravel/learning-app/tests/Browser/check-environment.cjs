const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        console.log(`Playwright ${require('playwright/package.json').version}`);
        console.log(`Chromium ${browser.version()}: 起動成功`);
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error.message);
    if (/Operation not permitted|sandbox_host_linux/.test(error.message)) {
        console.error('実行環境の制約です。Codexでは実行許可を使って再実行してください。ライブラリの再導入は不要です。');
    } else {
        console.error('README.mdの起動できない場合を確認してください。初回準備は npm run browser:install-deps と npm run browser:install です。');
    }
    process.exit(1);
});
