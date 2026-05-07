require('dotenv').config();

const express = require('express');
const axios = require('axios');
const { chromium } = require('playwright-core');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Monitor running');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.get('/', (req, res) => {
    res.send("Monitor running");
});

app.get('/test', (req, res) => {
    res.send("OK WORKING");
});
app.listen(PORT, '0.0.0.0', () => {
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
        '--disable-dev-shm-usage',
        '--disable-gpu'
    ]
});
        const context = await browser.newContext();
        const page = await context.newPage();

        let headers = null;

        page.on('request', (req) => {
            if (req.url().includes('/api/')) {
                headers = req.headers();
            }
        });

        await page.goto(process.env.WEBSITE_URL);
        await page.waitForTimeout(15000);

        if (headers) {
            const response = await axios.get(process.env.API_URL, {
                headers
            });

            console.log(response.data);

            if (response.data?.count > 10) {
                await axios.post(process.env.SLACK_WEBHOOK, {
                    text: `ALERT: ${response.data.count}`
                });
            }
        }

        await context.close();

    } catch (err) {
        console.log('ERROR:', err.message);
    } finally {
        if (browser) await browser.close();
        running = false;
    }
}

setInterval(monitor, 60000);
monitor();
