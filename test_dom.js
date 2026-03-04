const puppeteer = require('puppeteer-core');

(async () => {
    console.log("Launching local Chrome...");
    // Use local Chrome for testing
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true
    });

    const page = await browser.newPage();
    console.log("Navigating...");

    await page.goto('https://hibuddy.ca/products/brand?q=TRIBAL', { waitUntil: 'networkidle2' });

    // Age gate
    try {
        await page.waitForSelector('button:has-text("YES")', { timeout: 3000 });
        await page.click('button:has-text("YES")');
    } catch (e) { }

    await page.waitForTimeout(3000);

    console.log("Extracting products...");
    const products = await page.evaluate(() => {
        // Find product cards. They are usually anchor tags or specific divs.
        const items = [];
        // Just extract all text from the page to see what we have
        // Or look for specific pricing patterns like $XX.XX
        const els = document.querySelectorAll('a[href^="/product/"]');
        els.forEach(el => {
            items.push(el.innerText);
        });
        return items;
    });

    console.log("Found:", products.length, "items");
    if (products.length > 0) {
        console.log(products[0]);
        console.log("====================");
        console.log(products[1]);
    } else {
        console.log(await page.content().substring(0, 1000));
    }

    await browser.close();
})();
