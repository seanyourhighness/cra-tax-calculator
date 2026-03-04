const puppeteer = require('puppeteer-core');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true
    });

    // Spoof Ontario
    const payload = JSON.stringify({
        location: { lat: 43.6532, lon: -79.3832, name: 'Toronto', region: 'ON', locality: 'Toronto', activeRange: 50000, id: "" },
        govtStoresEnabled: true
    });

    const sessRes = await fetch('https://hibuddy.ca/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: payload
    });
    const sessData = await sessRes.json();

    const page = await browser.newPage();
    if (sessData.session_token) {
        await page.setCookie({
            name: 'session_token',
            value: sessData.session_token,
            domain: 'hibuddy.ca',
            path: '/'
        });
    }

    await page.goto('https://hibuddy.ca/', { waitUntil: 'networkidle2' });
    try { await page.click('button:has-text("YES")'); } catch (e) { }

    console.log("Typing search query 'Spinach'...");

    // Wait for the desktop search input
    await page.waitForSelector('input[placeholder*="Search" i]', { timeout: 5000 });
    const inputs = await page.$$('input[placeholder*="Search" i]');

    // Type into the first visible search input
    for (const input of inputs) {
        const isVisible = await input.evaluate(el => el.getBoundingClientRect().width > 0);
        if (isVisible) {
            await input.click();
            await input.type('Spinach');
            console.log("Typed Spinach. Hitting Enter...");
            await page.keyboard.press('Enter');
            break;
        }
    }

    console.log("Waiting for navigation...");
    await new Promise(r => setTimeout(r, 6000));

    console.log("New URL is:", page.url());

    const products = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('a[href^="/product/"]').forEach(card => {
            const text = card.innerText;
            results.push(text.replace(/\n/g, ' | '));
        });
        return results;
    });

    console.log("Products found on new URL:", products.length);
    if (products.length > 0) {
        console.log(JSON.stringify(products.slice(0, 2), null, 2));
    }

    await browser.close();
})();
