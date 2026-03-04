const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// ─── UTILITIES ───────────────────────────────────────────────

// Parse hibuddy size strings like "3.5g", "10x0.35g", "30ml", "1oz" → { totalGrams, display, isMultipack }
function parseWeight(sizeStr) {
    if (!sizeStr || sizeStr === 'Unknown') return { totalGrams: 0, display: sizeStr || '?', isMultipack: false, units: 1 };
    const s = sizeStr.trim();
    // Multipack: "10x0.35g" or "3x0.5g"
    const multi = s.match(/(\d+)\s*x\s*([\d.]+)\s*(g|ml)/i);
    if (multi) {
        const units = parseInt(multi[1]);
        const per = parseFloat(multi[2]);
        return { totalGrams: units * per, display: s, isMultipack: true, units };
    }
    // Standard: "3.5g", "28g", "30ml"
    const std = s.match(/^([\d.]+)\s*(g|ml|oz)$/i);
    if (std) {
        let grams = parseFloat(std[1]);
        if (std[2].toLowerCase() === 'oz') grams *= 28;
        return { totalGrams: grams, display: s, isMultipack: false, units: 1 };
    }
    return { totalGrams: 0, display: s, isMultipack: false, units: 1 };
}

// Retailer tier classification
const DISCOUNT_CHAINS = ['value buds', 'canna cabana', 'sessions', 'fire & flower', 'fire and flower', 'one plant', 'tokyo smoke', 'spiritleaf', 'superette', 'dutch love', 'hobo', 'meta cannabis', 'tweed', 'shinny', 'j. supply co'];
const GOVT_STORES = ['ontario cannabis store', 'ocs', 'sqdc', 'bc cannabis store', 'aglc', 'cannabis nb', 'nslc', 'nblc', 'pei cannabis', 'yukon liquor', 'cannabis yukon'];

function tagRetailerTier(storeName) {
    const lower = (storeName || '').toLowerCase();
    if (DISCOUNT_CHAINS.some(d => lower.includes(d))) return 'DISCOUNT';
    if (GOVT_STORES.some(g => lower.includes(g))) return 'GOVERNMENT';
    return 'STANDARD';
}

// Extract terpenes and quality flags from product description
const TERPENES = ['myrcene', 'limonene', 'caryophyllene', 'pinene', 'linalool', 'humulene', 'terpinolene', 'ocimene', 'bisabolol', 'guaiol', 'nerolidol', 'valencene'];
const QUALITY_FLAGS = ['live rosin', 'live resin', 'diamond infused', 'diamond-infused', 'full spectrum', 'cold cured', 'ice water hash', 'solventless', 'organic', 'hand-trimmed', 'hand trimmed', 'small batch', 'craft', 'indica', 'sativa', 'hybrid'];

function extractQualitative(descr) {
    if (!descr) return { terpenes: [], qualityFlags: [] };
    const lower = descr.toLowerCase();
    const terpenes = TERPENES.filter(t => lower.includes(t));
    const qualityFlags = QUALITY_FLAGS.filter(f => lower.includes(f));
    return { terpenes, qualityFlags };
}

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

    const { brand, province, size, mode, productId } = req.query;

    // ─── MODE: DETAIL — Per-store pricing for a specific product ───
    if (mode === 'detail' && productId) {
        return handleDetailMode(req, res, productId, size, province);
    }

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

        // Listen for GraphQL responses — target meiliSearch (the actual search results)
        page.on('response', async (response) => {
            if (response.url().includes('graphql') && response.request().method() === 'POST') {
                try {
                    const json = await response.json();
                    if (json.data && json.data.meiliSearch && products.length === 0) {
                        // meiliSearch = the real brand-filtered search results (up to 100 items)
                        products = json.data.meiliSearch.map(p => {
                            // Entity resolution: brand vs product
                            const brandName = (p.brand || brand).trim();
                            const productName = (p.prodname || 'Unknown Product').trim();

                            // Weight normalization & PPG
                            const allSizes = Array.isArray(p.availsize) ? p.availsize : [];
                            const primarySize = allSizes[0] || 'Unknown';
                            const parsed = parseWeight(primarySize);
                            const price = typeof p.price === 'number' ? p.price : 0;
                            const ppg = parsed.totalGrams > 0 ? +(price / parsed.totalGrams).toFixed(2) : (p.availppg || 0);

                            // THC/CBD potency (Health Canada ranges)
                            const thcMin = typeof p.thcmin === 'number' ? p.thcmin : 0;
                            const thcMax = typeof p.thcmax === 'number' ? p.thcmax : 0;
                            const cbdMin = typeof p.cbdmin === 'number' ? p.cbdmin : 0;
                            const cbdMax = typeof p.cbdmax === 'number' ? p.cbdmax : 0;
                            const thcMedian = thcMin || thcMax ? +((thcMin + thcMax) / 2).toFixed(1) : 0;
                            const cbdMedian = cbdMin || cbdMax ? +((cbdMin + cbdMax) / 2).toFixed(1) : 0;

                            // Edible cap logic: 10mg THC per package (federal limit)
                            const isEdible = (p.category1 || '').toLowerCase() === 'edibles';
                            const pricePerMgTHC = isEdible && thcMedian > 0 ? +(price / 10).toFixed(2) : null;

                            return {
                                productId: p._id || p.id || '',
                                brandName,
                                productName,
                                brand: `${brandName} — ${productName}`,
                                strainType: p.strain || '',
                                formFactor: p.category2 || p.category1 || 'Unknown',
                                category: p.category1 || '',
                                price,
                                ppg,
                                size: primarySize,
                                allSizes,
                                totalGrams: parsed.totalGrams,
                                isMultipack: parsed.isMultipack,
                                units: parsed.units,
                                thcMin, thcMax, thcMedian,
                                cbdMin, cbdMax, cbdMedian,
                                thc: thcMin || thcMax ? `${thcMin}-${thcMax}%` : '',
                                cbd: cbdMin || cbdMax ? `${cbdMin}-${cbdMax}%` : '',
                                pricePerMgTHC,
                                stores: p.numstores || 0,
                                isSale: p.badge === 'S' || p.badge === 'SALE' || p.badge === 'Y',
                                badge: p.badge || 'N',
                                imgUrl: p.imgurl || `https://hibuddy.ca/assets/pics/${p._id || ''}.jpg`,
                                stars: p.stars || 0,
                                starsCount: p.stars_count || 0,
                                source: 'hibuddy.ca'
                            };
                        });
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

                            let isSale = false;

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

                            // Check for sale or deal text in the card's text
                            if (text.toLowerCase().includes('sale') || text.toLowerCase().includes('clearance') || text.includes('%')) {
                                isSale = true;
                            }

                            results.push({
                                brand: inferredBrand,
                                name: inferredName,
                                strain: inferredName, // Best guess for strain is the product name
                                formFactor: 'Unknown', // Hard to precisely guess from list view
                                price: parsedPrice,
                                size: inferredSize || 'Unknown',
                                isSale: isSale,
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

        return res.status(200).json({ success: true, products: products.slice(0, 50) });
    } catch (error) {
        if (browser) await browser.close();
        console.error("Scrape Error:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// ─── DETAIL MODE: Per-store pricing for a single product ───
async function handleDetailMode(req, res, productId, targetSize, province) {
    const PROVINCES = {
        'ON': { lat: 43.6532, lon: -79.3832, name: 'Toronto', region: 'ON', locality: 'Toronto' },
        'AB': { lat: 51.0447, lon: -114.0719, name: 'Calgary', region: 'AB', locality: 'Calgary' },
        'BC': { lat: 49.2827, lon: -123.1207, name: 'Vancouver', region: 'BC', locality: 'Vancouver' },
        'MB': { lat: 49.8951, lon: -97.1384, name: 'Winnipeg', region: 'MB', locality: 'Winnipeg' },
        'SK': { lat: 52.1332, lon: -106.6700, name: 'Saskatoon', region: 'SK', locality: 'Saskatoon' },
    };

    let browser = null;
    try {
        const isLocal = process.platform === 'darwin' || process.platform === 'win32';
        const executablePath = isLocal
            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            : await chromium.executablePath();

        browser = await puppeteer.launch({
            args: isLocal ? puppeteer.defaultArgs() : [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
            defaultViewport: chromium.defaultViewport,
            executablePath,
            headless: isLocal ? true : chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // Province spoofing
        if (province && PROVINCES[province]) {
            try {
                const loc = PROVINCES[province];
                const sessRes = await fetch('https://hibuddy.ca/api/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
                    body: JSON.stringify({
                        location: { lat: loc.lat, lon: loc.lon, name: loc.name, region: loc.region, locality: loc.locality, activeRange: 50000, id: "" },
                        govtStoresEnabled: true
                    })
                });
                const sessData = await sessRes.json();
                if (sessData.session_token) {
                    await page.setCookie({ name: 'session_token', value: sessData.session_token, domain: 'hibuddy.ca', path: '/' });
                }
            } catch (e) { }
        }

        await page.setRequestInterception(true);
        let itemData = null;
        page.on('request', (request) => {
            const type = request.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(type)) request.abort();
            else request.continue();
        });
        // Capture the product detail item data (has description, strain info)
        page.on('response', async (response) => {
            if (response.url().includes('graphql') && response.request().method() === 'POST') {
                try {
                    const json = await response.json();
                    if (json.data && json.data.item && !itemData) {
                        itemData = json.data.item;
                    }
                } catch (e) { }
            }
        });

        await page.goto(`https://hibuddy.ca/product/${productId}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 3000));

        // Click the target size tab if specified
        if (targetSize) {
            await page.evaluate((sz) => {
                const buttons = document.querySelectorAll('button, [role="button"], a');
                for (const btn of buttons) {
                    const text = (btn.innerText || '').trim();
                    if (text === sz || text.includes(sz)) {
                        btn.click();
                        return;
                    }
                }
            }, targetSize);
            await new Promise(r => setTimeout(r, 2000));
        }

        // Scrape store-level pricing from the DOM
        const storeData = await page.evaluate(() => {
            const stores = [];
            // Hibuddy renders store rows as <a> elements containing store name, address, distance, and price
            document.querySelectorAll('a, div, li').forEach(el => {
                const text = el.innerText || '';
                const priceMatch = text.match(/\$(\d+\.\d{2})/);
                // Filter: must have a price, "km" for distance, and be reasonably sized (not a wrapper)
                if (priceMatch && text.includes('km') && text.length < 400 && text.length > 10) {
                    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
                    const distMatch = text.match(/([\d.]+)\s*km/);
                    stores.push({
                        name: lines[0] || 'Unknown Store',
                        address: lines.find(l => /\d/.test(l) && (l.includes('AVE') || l.includes('ST') || l.includes('RD') || l.includes('BLVD') || l.includes('DR') || l.includes(','))) || '',
                        distance: distMatch ? parseFloat(distMatch[1]) : null,
                        price: parseFloat(priceMatch[1]),
                        phone: (text.match(/\(\d{3}\)\s*\d{3}-\d{4}/) || [''])[0]
                    });
                }
            });

            // Deduplicate by store name + price
            const seen = new Set();
            return stores.filter(s => {
                const key = `${s.name}|${s.price}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        });

        await browser.close();

        if (storeData.length === 0) {
            return res.status(404).json({ success: false, error: 'No store pricing found for this product.' });
        }

        const prices = storeData.map(s => s.price).sort((a, b) => a - b);
        const low = prices[0];
        const high = prices[prices.length - 1];
        const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
        const median = prices.length % 2 === 0
            ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
            : prices[Math.floor(prices.length / 2)];

        // Retailer tier tagging
        const taggedStores = storeData.map(s => ({
            ...s,
            tier: tagRetailerTier(s.name)
        }));

        // Extract product metadata from the item GraphQL response
        let productMeta = null;
        if (itemData) {
            const qual = extractQualitative(itemData.descr || '');
            productMeta = {
                description: itemData.descr || '',
                strain: itemData.strain || '',
                imgUrl: itemData.imgurl || '',
                tag: itemData.tag || '',
                terpenes: qual.terpenes,
                qualityFlags: qual.qualityFlags
            };
        }

        return res.status(200).json({
            success: true,
            productId,
            storeCount: taggedStores.length,
            searchRadius: '50km',
            pricing: {
                low: +low.toFixed(2),
                high: +high.toFixed(2),
                avg: +avg.toFixed(2),
                median: +median.toFixed(2),
            },
            stores: taggedStores.slice(0, 30),
            productMeta
        });
    } catch (error) {
        if (browser) await browser.close();
        console.error("Detail Scrape Error:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
