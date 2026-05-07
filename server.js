```javascript
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const { chromium } = require('playwright');

const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Monitor running');
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});

let running = false;

async function monitor() {

    if (running) return;

    running = true;

    let browser;

    try {

        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const context = await browser.newContext();

        const page = await context.newPage();

        let latestHeaders = null;

        page.on('request', request => {

            const url = request.url();

            console.log('REQ:', url);

            if (url.includes('/api/')) {

                latestHeaders = request.headers();

                console.log('Captured fresh API headers');
            }
        });

        await page.goto(process.env.WEBSITE_URL);

        // Wait for QR scan manually first time
        await page.waitForTimeout(30000);

        // Example protected API request
        if (latestHeaders) {

            const response = await axios.get(
                process.env.API_URL,
                {
                    headers: latestHeaders
                }
            );

            console.log(response.data);

            // Example alert condition
            if (response.data.count > 10) {

                await axios.post(
                    process.env.SLACK_WEBHOOK,
                    {
                        text: `ALERT count: ${response.data.count}`
                    }
                );

                console.log('Alert sent');
            }
        }

        await context.storageState({
            path: './user-data/state.json'
        });

    } catch (err) {

        console.log(err.message);

    } finally {

        if (browser) {
            await browser.close();
        }

        running = false;
    }
}

// Run every minute
setInterval(monitor, 60000);

// Run immediately
monitor();
```
