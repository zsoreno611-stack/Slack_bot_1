const { chromium } = require('playwright');
const fs = require('fs');

(async () => {

    const browser = await chromium.launch({
        headless: false, // MUST be false for QR scan
        args: ['--no-sandbox']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(process.env.WEBSITE_URL);

    console.log("📌 Scan QR code now...");

    // wait time for manual login
    await page.waitForTimeout(120000);

    // save session
    await context.storageState({
        path: 'user-data/state.json'
    });

    console.log("✅ Session saved!");

    await browser.close();

})();
