const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

module.exports = async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { brand, province, size } = req.query;
    if (!brand) {
        return res.status(400).json({ error: 'Missing brand parameter' });
    }

    const PROVINCES = {
        'ON': { lat: 43.6532, lon: -79.3832, name: 'Toronto', region: 'ON', locality: 'Toronto' },
        'AB': { lat: 51.0447, lon: -114.0719, name: 'Calgary', region: 'AB', locality: 'Calgary' },
        'BC': { lat: 49.2827, lon: -123.1207, name: 'Vancouver', region: 'BC', locality: 'Vancouver' },
        'MB': { lat: 49.8951, lon: -97.1384, name: 'Winnipeg', region: 'MB', locality: 'Winnipeg' },
        'SK': { lat: 52.1332, lon: -106.6700, name: 'Saskatoon', region: 'SK', locality: 'Saskatoon' }
    };

    let browser = null;
    try {
        // Strict detection for local macOS/Windows vs Vercel Serverless (Linux)
        const isLocal = process.platform === 'darwin' || process.platform === 'win32' || process.env.VERCEL_ENV === 'development';

        let executablePath = null;
        if (isLocal) {
            // macOS path for local testing
            executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        } else {
            // Vercel Lambda path
            executablePath = await chromium.executablePath();
        }

        browser = await puppeteer.launch({
            args: isLocal ? puppeteer.defaultArgs() : [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
            defaultViewport: chromium.defaultViewport,
            executablePath: executablePath,
            headless: isLocal ? true : chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // Dynamically spoof the province by securely acquiring a session token from Hibuddy
        if (province && PROVINCES[province]) {
            try {
                const loc = PROVINCES[province];
                const payload = JSON.stringify({
                    location: { lat: loc.lat, lon: loc.lon, name: loc.name, region: loc.region, locality: loc.locality, activeRange: 50000, id: "" },
                    govtStoresEnabled: true
                });

                const sessRes = await fetch('https://hibuddy.ca/api/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
                    body: payload
                });
                const sessData = await sessRes.json();

                if (sessData.session_token) {
                    await page.setCookie({
                        name: 'session_token',
                        value: sessData.session_token,
                        domain: 'hibuddy.ca',
                        path: '/'
                    });
                }
            } catch (e) {
                console.error("Failed to fetch session token for province spoofing", e);
            }
        }

        // Optimize page load speed
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const type = request.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(type) && !request.url().includes('graphql')) {
                request.abort();
            } else {
                request.continue();
            }
        });

        let products = [];

        // Listen for GraphQL product response
        page.on('response', async (response) => {
            if (response.url().includes('graphql') && response.request().method() === 'POST') {
                try {
                    const postData = response.request().postData();
                    if (postData && postData.includes('main_page_query')) {
                        const json = await response.json();
                        if (json.data && json.data.products) {
                            // GraphQL returns products with this shape, flatten them
                            products = json.data.products.map(p => ({
                                brand: p.brand || brand,
                                name: p.name || p.strain || 'Unknown Product',
                                price: p.price ? (p.price.price || p.price.minPrice) : 0,
                                size: p.size || '3.5g',
                                source: 'hibuddy.ca'
                            }));
                        }
                    }
                } catch (e) {
                    // Ignore parse errors on other graphql queries
                }
            }
        });

        const url = `https://hibuddy.ca/products/search?q=${encodeURIComponent(brand)}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Wait slightly to allow React and Network requests to settle
        await new Promise(r => setTimeout(r, 4000));

        // Fallback if network interception failed: extract straight from DOM
        if (products.length === 0) {
            products = await page.evaluate((searchBrand) => {
                const results = [];
                // Attempt to find the main product grid cards
                // They typically contain an image, brand name, product name, and a price strip
                const cards = document.querySelectorAll('a[href^="/product/"]');

                cards.forEach((card) => {
                    // Look for price text like "$29.99"
                    const text = card.innerText;
                    const match = text.match(/\$([0-9]+\.[0-9]{2})/);

                    if (match && !text.includes('Categories') && !text.includes('Brands') && !text.match(/\(\d+\)/)) {
                        // A real product card usually has the brand name on top
                        const lines = text.split('\n').map(s => s.trim()).filter(Boolean);

                        // We want to avoid generic filter links. If it has a price and multiple lines, it's a product
                        if (lines.length >= 3) {
                            let inferredBrand = searchBrand;
                            let inferredName = 'Product';
                            let inferredSize = '';
                            let parsedPrice = parseFloat(match[1]);

                            // Try to smartly guess lines based on length/content
                            if (lines[0].toUpperCase() === lines[0]) {
                                inferredBrand = lines[0]; // All caps is usually the brand
                                inferredName = lines[1];
                                inferredSize = lines.length >= 4 ? lines[2] : '';
                            } else {
                                inferredName = lines[0];
                                inferredSize = lines.length >= 3 ? lines[1] : '';
                            }

                            // If size line contains the price, it might mean there's no badge
                            if (inferredSize && inferredSize.includes('$')) {
                                inferredSize = '';
                            }

                            results.push({
                                brand: inferredBrand,
                                name: inferredName,
                                price: parsedPrice,
                                size: inferredSize || 'Unknown',
                                source: 'hibuddy.ca / ' + inferredBrand
                            });
                        }
                    }
                });
                return results;
            }, brand);

            // Filter out duplicate names with higher prices (we usually want best price per product)
            const uniqueProducts = {};
            products.forEach(p => {
                if (!uniqueProducts[p.name] || uniqueProducts[p.name].price > p.price) {
                    uniqueProducts[p.name] = p;
                }
            });
            products = Object.values(uniqueProducts);
        }

        // Filter by size if requested (supports common g/oz equivalents)
        if (size) {
            let searchSize = size.toLowerCase().replace(/\s/g, '');
            let matchRegex = null;

            if (searchSize === '28' || searchSize === '28g') {
                matchRegex = /(28g|28\s*g|1\s*oz|ounce)/i;
            } else if (searchSize === '14' || searchSize === '14g') {
                matchRegex = /(14g|14\s*g|half\s*oz|\.5\s*oz|1\/2\s*oz)/i;
            } else if (searchSize === '7' || searchSize === '7g') {
                matchRegex = /(7g|7\s*g|quarter\s*oz|\.25\s*oz|1\/4\s*oz)/i;
            } else if (searchSize === '3.5' || searchSize === '3.5g') {
                matchRegex = /(3\.5g|3\.5\s*g|eighth|1\/8|3\.50g)/i;
            } else {
                if (!isNaN(parseFloat(searchSize)) && !searchSize.includes('g') && !searchSize.includes('oz')) {
                    searchSize += 'g';
                }
                matchRegex = new RegExp(searchSize.replace(/\./g, '\\.'), 'i');
            }

            products = products.filter(p => {
                const s = (p.size || '').replace(/\s/g, '');
                const n = (p.name || '');
                return matchRegex.test(s) || matchRegex.test(n);
            });
        }

        // Default fallback if brand has no products listed at all (or after filter)
        if (products.length === 0) {
            return res.status(404).json({ success: false, error: 'No products found matching those filters on hibuddy.' });
        }

        // Sort by price ascending
        products.sort((a, b) => a.price - b.price);

        await browser.close();

        return res.status(200).json({ success: true, products: products.slice(0, 10) });
    } catch (error) {
        if (browser) await browser.close();
        console.error("Scrape Error:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};
