// ============================================================
// Competition Intelligence Engine
// 3-Level Progressive Disclosure: Market Overview → Scatter Plot → SKU Deep Dive
// ============================================================

(function () {
    "use strict";

    // Market baselines by category (per gram or per unit)
    const CATEGORY_RANGES = {
        dried_flower: { budget: 4.50, avg: 7.50, premium: 12.00, unit: "/g" },
        pre_rolls: { budget: 5.00, avg: 9.00, premium: 15.00, unit: "/ea" },
        vapes: { budget: 25.00, avg: 40.00, premium: 65.00, unit: "/ea" },
        edibles: { budget: 5.00, avg: 8.00, premium: 14.00, unit: "/ea" },
        extracts: { budget: 20.00, avg: 35.00, premium: 60.00, unit: "/ea" }
    };

    const CATEGORY_SEARCH = {
        dried_flower: "whole flower",
        pre_rolls: "pre-rolls",
        vapes: "vapes 510",
        edibles: "edibles gummies",
        extracts: "extracts concentrate"
    };

    // Price tier bands (shelf price ranges per quality tier)
    const PRICE_TIERS = {
        budget: { min: 0, max: 20, label: 'Budget', color: '#94a3b8' },
        mid: { min: 18, max: 32, label: 'Mid-Range', color: '#3b82f6' },
        premium: { min: 28, max: 55, label: 'Premium', color: '#8b5cf6' },
        ultra_premium: { min: 45, max: 999, label: 'Ultra-Premium', color: '#f59e0b' },
        all: { min: 0, max: 999, label: 'All Tiers', color: '#64748b' }
    };

    // Filter & score products by relevance to user's product
    function filterByRelevance(products, yourPrice, qualityTier, minTHC, yourSize) {
        const tier = PRICE_TIERS[qualityTier] || PRICE_TIERS.all;
        const priceCenter = yourPrice || ((tier.min + Math.min(tier.max, 100)) / 2);
        const priceMin = Math.max(tier.min, priceCenter * 0.6);
        const priceMax = tier.max < 999 ? tier.max : priceCenter * 1.8;

        // Parse user's size for matching
        const sizeMatch = (yourSize || '').match(/([\d.]+)/);
        const yourGrams = sizeMatch ? parseFloat(sizeMatch[1]) : 0;

        return products
            .filter(p => {
                const price = parseFloat(p.price);
                if (price <= 0) return false;

                // Price band filter
                if (price < priceMin || price > priceMax) return false;

                // Min THC filter
                if (minTHC && p.thcMedian && p.thcMedian < minTHC) return false;

                return true;
            })
            .map(p => {
                // Calculate relevance score (0-100)
                const price = parseFloat(p.price);
                const priceDiff = Math.abs(price - priceCenter);
                const priceScore = Math.max(0, 100 - (priceDiff / priceCenter) * 100); // 60% weight

                const thcScore = p.thcMedian > 0 ? Math.min(100, p.thcMedian * 3.5) : 50; // 30% weight
                const storeScore = Math.min(100, (p.stores || 0) * 2); // 10% weight

                // Size proximity bonus
                let sizeBonus = 0;
                if (yourGrams > 0 && p.totalGrams > 0) {
                    sizeBonus = p.totalGrams === yourGrams ? 15 : -10;
                }

                const relevance = Math.round(
                    (priceScore * 0.6) + (thcScore * 0.3) + (storeScore * 0.1) + sizeBonus
                );

                return { ...p, relevance: Math.min(99, Math.max(1, relevance)) };
            })
            .sort((a, b) => b.relevance - a.relevance);
    }

    // Persistent state
    let competitors = [];
    let allProducts = []; // Full enriched product data for scatter plot
    const STORAGE_KEY = "pc_competitors";
    const YOUR_STORAGE_KEY = "pc_your_product";

    // Retailer tier tag (mirror of backend)
    const DISCOUNT_CHAINS = ['value buds', 'canna cabana', 'sessions', 'fire & flower', 'one plant', 'tokyo smoke', 'spiritleaf', 'superette', 'dutch love', 'hobo', 'meta cannabis', 'tweed'];
    const GOVT_STORES = ['ontario cannabis store', 'ocs', 'sqdc', 'bc cannabis store', 'aglc'];
    function tagRetailerTier(name) {
        const lower = (name || '').toLowerCase();
        if (DISCOUNT_CHAINS.some(d => lower.includes(d))) return 'DISCOUNT';
        if (GOVT_STORES.some(g => lower.includes(g))) return 'GOVERNMENT';
        return 'STANDARD';
    }

    // Tier colors
    const TIER_COLORS = { DISCOUNT: '#ef4444', GOVERNMENT: '#3b82f6', STANDARD: '#94a3b8' };
    const TIER_LABELS = { DISCOUNT: '💸 Discount Chain', GOVERNMENT: '🏛️ Government', STANDARD: '🏪 Independent' };

    // ── COGS / Margin Estimation (Canadian Cannabis Industry Standards) ──
    // Reverse-engineers from retail shelf price to estimate LP economics.
    // Based on: OCS ~30% markup, Excise = max($1/g, 10% of dutiable), LP COGS ~40-50%.
    function estimateCOGS(shelfPrice, totalGrams, category) {
        if (!shelfPrice || shelfPrice <= 0) return null;
        const grams = totalGrams || 3.5; // default to 3.5g

        // Step 1: Retail → Wholesale (retailers typically buy at 55-65% of shelf)
        const retailMarginPct = 0.38; // ~38% retail markup on cannabis
        const wholesalePrice = shelfPrice * (1 - retailMarginPct);

        // Step 2: Wholesale → LP Revenue (remove provincial markup)
        // OCS markup is approximately 30% of LP submitted price
        const provincialMarkupPct = 0.30;
        const lpSubmittedPrice = wholesalePrice / (1 + provincialMarkupPct);

        // Step 3: Remove Excise Duty
        // Federal excise = greater of flat rate ($1/g for flower, $0.01/mg THC for edibles)
        //                   or ad valorem rate (10% of dutiable amount)
        const isEdible = (category || '').toLowerCase().includes('edible');
        let exciseDuty;
        if (isEdible) {
            // Edibles: $0.01/mg THC (max 10mg) ≈ $0.10 per package
            exciseDuty = 0.10;
        } else {
            // Flower/pre-rolls: $1/g or 10% of dutiable amount, whichever is higher
            const flatRate = grams * 1.00;
            const adValorem = lpSubmittedPrice * 0.10;
            exciseDuty = Math.max(flatRate, adValorem);
        }
        const lpRevenue = lpSubmittedPrice - exciseDuty;

        // Step 4: LP COGS (industry avg 40-50% of net revenue)
        const cogsRatio = 0.45;
        const estimatedCOGS = lpRevenue * cogsRatio;
        const unitMargin = lpRevenue - estimatedCOGS;
        const marginPct = lpRevenue > 0 ? (unitMargin / lpRevenue) * 100 : 0;

        return {
            shelfPrice: +shelfPrice.toFixed(2),
            wholesalePrice: +wholesalePrice.toFixed(2),
            lpSubmittedPrice: +lpSubmittedPrice.toFixed(2),
            exciseDuty: +exciseDuty.toFixed(2),
            lpRevenue: +Math.max(0, lpRevenue).toFixed(2),
            estimatedCOGS: +Math.max(0, estimatedCOGS).toFixed(2),
            unitMargin: +Math.max(0, unitMargin).toFixed(2),
            marginPct: +Math.max(0, marginPct).toFixed(1),
            ppg: +(shelfPrice / grams).toFixed(2),
            cogsPerGram: +(estimatedCOGS / grams).toFixed(2)
        };
    }

    // Load from localStorage
    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) competitors = JSON.parse(saved);
        } catch (e) { competitors = []; }

        try {
            const savedYour = localStorage.getItem(YOUR_STORAGE_KEY);
            if (savedYour) {
                const y = JSON.parse(savedYour);
                if (y.name) document.getElementById("pcProductName").value = y.name;
                if (y.category) document.getElementById("pcCategory").value = y.category;
                if (y.weight) document.getElementById("pcWeight").value = y.weight;
                if (y.price) document.getElementById("pcYourPrice").value = y.price;
                if (y.qualityTier) document.getElementById("pcQualityTier").value = y.qualityTier;
                if (y.minTHC) document.getElementById("pcMinTHC").value = y.minTHC;
            }
        } catch (e) { /* ignore */ }
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(competitors));
        const yourData = {
            name: document.getElementById("pcProductName").value,
            category: document.getElementById("pcCategory").value,
            weight: document.getElementById("pcWeight").value,
            price: document.getElementById("pcYourPrice").value,
            qualityTier: document.getElementById("pcQualityTier").value,
            minTHC: document.getElementById("pcMinTHC").value
        };
        localStorage.setItem(YOUR_STORAGE_KEY, JSON.stringify(yourData));
    }

    // ═══════════════════════════════════════════════════════════
    // LEVEL 1: Market Overview — Product Card Grid with Images
    // ═══════════════════════════════════════════════════════════

    function renderMarketOverview(products) {
        const container = document.getElementById("pcMarketCards");
        if (!container) return;

        if (!products || products.length === 0) {
            container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 40px;">No competitor data yet. Use <strong>Fetch Prices</strong> or <strong>Discover Competitors</strong> above.</p>';
            return;
        }

        // KPI calculations
        const prices = products.map(p => parseFloat(p.price)).filter(p => p > 0);
        const ppgs = products.map(p => parseFloat(p.ppg)).filter(p => p > 0);
        const thcs = products.map(p => parseFloat(p.thcMedian)).filter(t => t > 0);
        const avgPrice = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
        const avgPPG = ppgs.length ? (ppgs.reduce((a, b) => a + b, 0) / ppgs.length) : 0;
        const medianTHC = thcs.length ? thcs.sort((a, b) => a - b)[Math.floor(thcs.length / 2)] : 0;
        const priceRange = prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 };
        const filteredInfo = products[0] && products[0]._totalBeforeFilter
            ? `<div class="ci-kpi"><span class="ci-kpi-value">${products.length}/${products[0]._totalBeforeFilter}</span><span class="ci-kpi-label">Shown / Found</span></div>`
            : '';

        // KPI Strip
        const kpiHtml = `
        <div class="ci-kpi-strip">
            <div class="ci-kpi">
                <span class="ci-kpi-value">${products.length}</span>
                <span class="ci-kpi-label">Competitors</span>
            </div>
            <div class="ci-kpi">
                <span class="ci-kpi-value">$${avgPrice.toFixed(2)}</span>
                <span class="ci-kpi-label">Avg Price</span>
            </div>
            <div class="ci-kpi">
                <span class="ci-kpi-value">$${avgPPG.toFixed(2)}</span>
                <span class="ci-kpi-label">Avg $/g</span>
            </div>
            <div class="ci-kpi">
                <span class="ci-kpi-value">${medianTHC > 0 ? medianTHC + '%' : 'N/A'}</span>
                <span class="ci-kpi-label">Median THC</span>
            </div>
            <div class="ci-kpi">
                <span class="ci-kpi-value">$${priceRange.min.toFixed(2)}–$${priceRange.max.toFixed(2)}</span>
                <span class="ci-kpi-label">Price Range</span>
            </div>
            ${filteredInfo}
        </div>`;

        // Product cards
        const cardsHtml = products.map((p, idx) => {
            const isEdible = (p.category || '').toLowerCase() === 'edibles';
            const ppgDisplay = p.ppg > 0 ? `$${p.ppg.toFixed(2)}/g` : '';
            const thcDisplay = p.thc || '';
            const imgSrc = p.imgUrl || `https://hibuddy.ca/assets/pics/${p.productId}.jpg`;
            const relevanceScore = p.relevance || 0;
            const relevanceColor = relevanceScore >= 80 ? '#10b981' : relevanceScore >= 60 ? '#f59e0b' : '#ef4444';
            const relevanceLabel = relevanceScore >= 80 ? 'High Match' : relevanceScore >= 60 ? 'Fair Match' : 'Low Match';

            return `
            <div class="ci-product-card" data-idx="${idx}" data-pid="${p.productId}">
                <div class="ci-card-img-wrap">
                    <img src="${imgSrc}" alt="${p.productName || p.brand}" loading="lazy" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="ci-card-img-fallback" style="display:none;">📦</div>
                    ${p.isSale ? '<span class="ci-sale-badge">SALE</span>' : ''}
                    ${relevanceScore > 0 ? `<span class="ci-relevance-badge" style="background: ${relevanceColor};">${relevanceScore}%</span>` : ''}
                </div>
                <div class="ci-card-body">
                    <div class="ci-card-brand">${p.brandName || ''}</div>
                    <div class="ci-card-name" title="${p.productName || p.brand}">${p.productName || p.brand}</div>
                    <div class="ci-card-meta">
                        ${p.formFactor && p.formFactor !== 'Unknown' ? `<span class="ci-tag">📦 ${p.formFactor}</span>` : ''}
                        ${p.size && p.size !== 'Unknown' ? `<span class="ci-tag">⚖️ ${p.size}</span>` : ''}
                        ${p.strainType ? `<span class="ci-tag ci-tag-strain">${p.strainType}</span>` : ''}
                    </div>
                    <div class="ci-card-metrics">
                        ${thcDisplay ? `<span class="ci-thc-pill">🧪 ${thcDisplay}</span>` : ''}
                        ${p.cbdMedian > 0 ? `<span class="ci-cbd-pill">💚 CBD ${p.cbdMedian}%</span>` : ''}
                        ${isEdible && p.pricePerMgTHC ? `<span class="ci-tag" style="color: #fbbf24;">⚡ $${p.pricePerMgTHC}/mg THC</span>` : ''}
                    </div>
                    <div class="ci-card-footer">
                        <div>
                            <span class="ci-card-price">$${parseFloat(p.price).toFixed(2)}</span>
                            <span class="ci-card-price-label">lowest</span>
                        </div>
                        <div class="ci-card-ppg">${ppgDisplay}</div>
                    </div>
                    <div class="ci-card-stores">${p.stores ? `🏪 ${p.stores} stores` : ''}</div>
                </div>
                <div class="ci-card-expand" id="ciExpand-${idx}"></div>
            </div>`;
        }).join('');

        container.innerHTML = kpiHtml + `<div class="ci-card-grid">${cardsHtml}</div>`;

        // Bind click-to-expand for Level 3
        container.querySelectorAll('.ci-product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking inside the expand panel
                if (e.target.closest('.ci-card-expand') && e.target.tagName !== 'DIV') return;
                const idx = parseInt(card.dataset.idx);
                const pid = card.dataset.pid;
                handleSKUDeepDive(idx, pid, card);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════
    // LEVEL 2: Price War View — THC% vs Price Scatter Plot
    // ═══════════════════════════════════════════════════════════

    function renderScatterPlot(products) {
        const container = document.getElementById("pcScatterPlot");
        if (!container) return;

        const yourPrice = parseFloat(document.getElementById("pcYourPrice").value) || 0;
        const validProducts = products.filter(p => p.thcMedian > 0 && parseFloat(p.price) > 0);

        if (validProducts.length < 2) {
            container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 30px; font-size: 13px;">Need at least 2 products with THC data for the scatter plot.</p>';
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        canvas.style.width = '100%';
        canvas.style.maxHeight = '400px';
        container.innerHTML = '';
        container.appendChild(canvas);

        // Add tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'ci-scatter-tooltip';
        tooltip.style.display = 'none';
        container.appendChild(tooltip);

        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const PAD = { top: 30, right: 30, bottom: 50, left: 60 };
        const plotW = W - PAD.left - PAD.right;
        const plotH = H - PAD.top - PAD.bottom;

        // Data ranges
        const allTHC = validProducts.map(p => p.thcMedian);
        const allPrices = validProducts.map(p => parseFloat(p.price));
        const thcMin = Math.floor(Math.min(...allTHC) - 2);
        const thcMax = Math.ceil(Math.max(...allTHC) + 2);
        const priceMin = Math.floor(Math.min(...allPrices, yourPrice || Infinity) * 0.9);
        const priceMax = Math.ceil(Math.max(...allPrices, yourPrice || 0) * 1.1);

        function xScale(thc) { return PAD.left + ((thc - thcMin) / (thcMax - thcMin)) * plotW; }
        function yScale(price) { return PAD.top + plotH - ((price - priceMin) / (priceMax - priceMin)) * plotH; }

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);

        // Loss-leader zone (high THC, low price = bottom-right)
        const llX = xScale((thcMax + thcMin) / 2);
        const llY = yScale((priceMax + priceMin) / 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
        ctx.fillRect(llX, llY, W - PAD.right - llX, PAD.top + plotH - llY);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('LOSS-LEADER ZONE', llX + 8, PAD.top + plotH - 8);

        // Premium zone (high THC, high price = top-right)
        ctx.fillStyle = 'rgba(139, 92, 246, 0.04)';
        ctx.fillRect(llX, PAD.top, W - PAD.right - llX, llY - PAD.top);
        ctx.fillStyle = 'rgba(139, 92, 246, 0.25)';
        ctx.fillText('PREMIUM ZONE', llX + 8, PAD.top + 16);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let t = Math.ceil(thcMin); t <= thcMax; t += 5) {
            const x = xScale(t);
            ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + plotH); ctx.stroke();
        }
        for (let p = Math.ceil(priceMin); p <= priceMax; p += Math.max(1, Math.ceil((priceMax - priceMin) / 6))) {
            const y = yScale(p);
            ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + plotW, y); ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD.left, PAD.top);
        ctx.lineTo(PAD.left, PAD.top + plotH);
        ctx.lineTo(PAD.left + plotW, PAD.top + plotH);
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        for (let t = Math.ceil(thcMin); t <= thcMax; t += 5) {
            ctx.fillText(`${t}%`, xScale(t), PAD.top + plotH + 18);
        }
        ctx.fillText('Median THC %', PAD.left + plotW / 2, H - 5);

        ctx.textAlign = 'right';
        for (let p = Math.ceil(priceMin); p <= priceMax; p += Math.max(1, Math.ceil((priceMax - priceMin) / 6))) {
            ctx.fillText(`$${p}`, PAD.left - 8, yScale(p) + 4);
        }
        ctx.save();
        ctx.translate(12, PAD.top + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('Lowest Price ($)', 0, 0);
        ctx.restore();

        // Store dot positions for hover
        const dots = [];

        // Plot competitor dots
        validProducts.forEach((p, i) => {
            const x = xScale(p.thcMedian);
            const y = yScale(parseFloat(p.price));
            const r = Math.max(5, Math.min(12, Math.sqrt(p.stores || 1) * 2));

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = p.isSale ? 'rgba(239, 68, 68, 0.6)' : 'rgba(99, 102, 241, 0.5)';
            ctx.fill();
            ctx.strokeStyle = p.isSale ? '#ef4444' : '#6366f1';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            dots.push({ x, y, r, product: p });
        });

        // Plot YOUR product
        if (yourPrice > 0) {
            const yourName = document.getElementById("pcProductName").value || "Your Product";
            // Estimate THC (use category median or 0)
            const yourTHC = allTHC.length ? allTHC.reduce((a, b) => a + b, 0) / allTHC.length : 20;
            const x = xScale(yourTHC);
            const y = yScale(yourPrice);

            // Star marker
            ctx.save();
            ctx.translate(x, y);
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
                const r = i === 0 ? 10 : 10;
                ctx[i === 0 ? 'moveTo' : 'lineTo'](
                    Math.cos((i * 4 * Math.PI / 5) - Math.PI / 2) * 10,
                    Math.sin((i * 4 * Math.PI / 5) - Math.PI / 2) * 10
                );
                ctx.lineTo(
                    Math.cos((i * 4 * Math.PI / 5) - Math.PI / 2 + Math.PI / 5) * 4,
                    Math.sin((i * 4 * Math.PI / 5) - Math.PI / 2 + Math.PI / 5) * 4
                );
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

            // Label
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`⭐ ${yourName}`, x + 14, y + 4);
        }

        // Hover interaction
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            const hit = dots.find(d => Math.hypot(mx - d.x, my - d.y) < d.r + 3);
            if (hit) {
                tooltip.style.display = 'block';
                tooltip.style.left = `${e.clientX - container.getBoundingClientRect().left + 12}px`;
                tooltip.style.top = `${e.clientY - container.getBoundingClientRect().top - 10}px`;
                const p = hit.product;
                tooltip.innerHTML = `
                    <strong>${p.brandName}</strong> — ${p.productName}<br>
                    💰 $${parseFloat(p.price).toFixed(2)} &nbsp; 🧪 THC ${p.thcMedian}% &nbsp; ⚖️ ${p.size}<br>
                    📊 $${p.ppg > 0 ? p.ppg.toFixed(2) : '?'}/g &nbsp; 🏪 ${p.stores} stores
                    ${p.isSale ? '<br><span style="color:#fca5a5;">⚠️ On Sale</span>' : ''}
                `;
                canvas.style.cursor = 'pointer';
            } else {
                tooltip.style.display = 'none';
                canvas.style.cursor = 'crosshair';
            }
        });

        canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    }

    // ═══════════════════════════════════════════════════════════
    // LEVEL 3: SKU Deep Dive — Per-Store Pricing Panel
    // ═══════════════════════════════════════════════════════════

    async function handleSKUDeepDive(idx, productId, cardEl) {
        const panel = document.getElementById(`ciExpand-${idx}`);
        if (!panel) return;

        // Toggle if already loaded
        if (panel.dataset.loaded === 'true') {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            cardEl.classList.toggle('ci-card-expanded');
            return;
        }

        if (!productId) {
            panel.innerHTML = '<p class="ci-no-data">No product ID available for deep dive.</p>';
            panel.style.display = 'block';
            cardEl.classList.add('ci-card-expanded');
            return;
        }

        panel.innerHTML = '<div class="ci-loading-mini"><div class="pc-spinner"></div> Loading store pricing...</div>';
        panel.style.display = 'block';
        cardEl.classList.add('ci-card-expanded');

        const province = document.getElementById("pcScrapeProvince").value;
        const sizeInput = document.getElementById("pcWeight").value.trim();

        try {
            let url = `/api/scrape?mode=detail&productId=${encodeURIComponent(productId)}&province=${encodeURIComponent(province)}`;
            if (sizeInput) url += `&size=${encodeURIComponent(sizeInput)}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.success && data.pricing) {
                const p = data.pricing;
                const stores = data.stores || [];
                const meta = data.productMeta;

                // Terpene pills
                const terpeneHtml = meta && meta.terpenes && meta.terpenes.length > 0
                    ? meta.terpenes.map(t => `<span class="ci-terpene-pill">${t.charAt(0).toUpperCase() + t.slice(1)}</span>`).join('')
                    : '';
                const qualityHtml = meta && meta.qualityFlags && meta.qualityFlags.length > 0
                    ? meta.qualityFlags.map(f => `<span class="ci-quality-pill">${f}</span>`).join('')
                    : '';
                const descHtml = meta && meta.description
                    ? `<p class="ci-desc-text">${meta.description.substring(0, 300)}${meta.description.length > 300 ? '...' : ''}</p>`
                    : '';

                // Pricing grid
                const pricingGrid = `
                <div class="ci-pricing-grid">
                    <div class="ci-price-cell ci-price-low">
                        <div class="ci-price-label">LOW</div>
                        <div class="ci-price-val">$${p.low.toFixed(2)}</div>
                    </div>
                    <div class="ci-price-cell">
                        <div class="ci-price-label">AVG</div>
                        <div class="ci-price-val">$${p.avg.toFixed(2)}</div>
                    </div>
                    <div class="ci-price-cell">
                        <div class="ci-price-label">MEDIAN</div>
                        <div class="ci-price-val">$${p.median.toFixed(2)}</div>
                    </div>
                    <div class="ci-price-cell ci-price-high">
                        <div class="ci-price-label">HIGH</div>
                        <div class="ci-price-val">$${p.high.toFixed(2)}</div>
                    </div>
                </div>`;

                // COGS & Margin Estimation
                const product = allProducts[idx] || {};
                const totalGrams = product.totalGrams || 3.5;
                const productCategory = product.category || '';
                const cogsEstimate = estimateCOGS(p.avg, totalGrams, productCategory);

                let cogsHtml = '';
                if (cogsEstimate) {
                    cogsHtml = `
                    <div class="ci-cogs-section">
                        <div class="ci-section-label" style="margin-bottom: 8px;">📊 Estimated LP Economics (Industry Avg)</div>
                        <div class="ci-cogs-grid">
                            <div class="ci-cogs-cell">
                                <div class="ci-cogs-label">Wholesale</div>
                                <div class="ci-cogs-val">$${cogsEstimate.wholesalePrice.toFixed(2)}</div>
                                <div class="ci-cogs-sub">~${Math.round((1 - 0.38) * 100)}% of shelf</div>
                            </div>
                            <div class="ci-cogs-cell">
                                <div class="ci-cogs-label">Excise Duty</div>
                                <div class="ci-cogs-val ci-cogs-warn">-$${cogsEstimate.exciseDuty.toFixed(2)}</div>
                                <div class="ci-cogs-sub">$${(cogsEstimate.exciseDuty / totalGrams).toFixed(2)}/g</div>
                            </div>
                            <div class="ci-cogs-cell">
                                <div class="ci-cogs-label">LP Revenue</div>
                                <div class="ci-cogs-val">$${cogsEstimate.lpRevenue.toFixed(2)}</div>
                                <div class="ci-cogs-sub">Post-tax net</div>
                            </div>
                            <div class="ci-cogs-cell">
                                <div class="ci-cogs-label">Est. COGS</div>
                                <div class="ci-cogs-val ci-cogs-warn">$${cogsEstimate.estimatedCOGS.toFixed(2)}</div>
                                <div class="ci-cogs-sub">~45% of revenue</div>
                            </div>
                            <div class="ci-cogs-cell ci-cogs-highlight">
                                <div class="ci-cogs-label">Unit Margin</div>
                                <div class="ci-cogs-val">$${cogsEstimate.unitMargin.toFixed(2)}</div>
                                <div class="ci-cogs-sub">${cogsEstimate.marginPct.toFixed(0)}% margin</div>
                            </div>
                        </div>
                        <div class="ci-cogs-disclaimer">⚠️ Estimates based on OCS markup (~30%), federal excise ($1/g or 10%), and industry-avg COGS (~45%). Actual margins vary by LP.</div>
                    </div>`;
                }

                // Store table
                const storeRows = stores.slice(0, 15).map(s => {
                    const tier = s.tier || tagRetailerTier(s.name);
                    const tierColor = TIER_COLORS[tier] || '#94a3b8';
                    const tierEmoji = tier === 'DISCOUNT' ? '💸' : tier === 'GOVERNMENT' ? '🏛️' : '🏪';
                    return `
                    <tr class="ci-store-row">
                        <td>
                            <span class="ci-store-name">${s.name}</span>
                            <span class="ci-tier-badge" style="border-color: ${tierColor}; color: ${tierColor};">${tierEmoji} ${tier}</span>
                        </td>
                        <td class="ci-store-addr">${s.address || ''}</td>
                        <td class="ci-store-dist">${s.distance ? s.distance.toFixed(1) + ' km' : ''}</td>
                        <td class="ci-store-price">$${s.price.toFixed(2)}</td>
                    </tr>`;
                }).join('');

                panel.innerHTML = `
                    <div class="ci-deep-dive">
                        ${descHtml}
                        ${terpeneHtml || qualityHtml ? `
                        <div class="ci-qualitative">
                            ${terpeneHtml ? `<div class="ci-terp-section"><span class="ci-section-label">🌿 Terpenes</span> ${terpeneHtml}</div>` : ''}
                            ${qualityHtml ? `<div class="ci-qual-section"><span class="ci-section-label">✨ Quality</span> ${qualityHtml}</div>` : ''}
                        </div>` : ''}
                        ${pricingGrid}
                        ${cogsHtml}
                        <div class="ci-store-header">
                            <span>${data.storeCount} stores within ${data.searchRadius || '50km'}</span>
                        </div>
                        <table class="ci-store-table">
                            <thead><tr><th>Store</th><th>Address</th><th>Distance</th><th>Price</th></tr></thead>
                            <tbody>${storeRows}</tbody>
                        </table>
                    </div>
                `;
                panel.dataset.loaded = 'true';
            } else {
                panel.innerHTML = '<p class="ci-no-data">No store pricing data available for this product.</p>';
            }
        } catch (err) {
            panel.innerHTML = '<p class="ci-error">Error fetching store pricing. Try again.</p>';
            console.error("Deep dive error:", err);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // COMPARISON ANALYSIS — Bar Chart + Insights
    // ═══════════════════════════════════════════════════════════

    function updateComparison() {
        const yourPrice = parseFloat(document.getElementById("pcYourPrice").value);
        const validComps = allProducts.filter(p => parseFloat(p.price) > 0);
        const resultsEl = document.getElementById("pcResults");

        if (!yourPrice || yourPrice <= 0 || validComps.length === 0) {
            resultsEl.style.display = "none";
            return;
        }

        resultsEl.style.display = "block";

        const compPrices = validComps.map(c => parseFloat(c.price));
        const avgComp = compPrices.reduce((s, p) => s + p, 0) / compPrices.length;
        const minComp = Math.min(...compPrices);
        const maxComp = Math.max(...compPrices);
        const diff = yourPrice - avgComp;
        const diffPct = (diff / avgComp) * 100;

        // Market position label
        let position, posClass;
        if (diffPct < -10) { position = "Well Below Market"; posClass = "pos-low"; }
        else if (diffPct < -3) { position = "Below Market"; posClass = "pos-low"; }
        else if (diffPct <= 3) { position = "Market Rate"; posClass = "pos-mid"; }
        else if (diffPct <= 10) { position = "Above Market"; posClass = "pos-high"; }
        else { position = "Premium Priced"; posClass = "pos-high"; }

        // KPIs
        const kpiEl = document.getElementById("pcKPIs");
        kpiEl.innerHTML = `
      <div class="pc-kpi">
        <span class="pc-kpi-label">Your Price</span>
        <span class="pc-kpi-value pc-kpi-you">$${yourPrice.toFixed(2)}</span>
      </div>
      <div class="pc-kpi">
        <span class="pc-kpi-label">Competitor Avg</span>
        <span class="pc-kpi-value">$${avgComp.toFixed(2)}</span>
      </div>
      <div class="pc-kpi">
        <span class="pc-kpi-label">Difference</span>
        <span class="pc-kpi-value ${diff >= 0 ? 'pc-kpi-warn' : 'pc-kpi-good'}">${diff >= 0 ? '+' : ''}$${diff.toFixed(2)} (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%)</span>
      </div>
      <div class="pc-kpi">
        <span class="pc-kpi-label">Position</span>
        <span class="pc-kpi-value ${posClass}">${position}</span>
      </div>
    `;

        // Chart — horizontal bar chart (using top 15 for readability)
        const allPriceData = [{ name: document.getElementById("pcProductName").value || "Your Product", price: yourPrice, isYou: true }];
        validComps.slice(0, 15).forEach(c => allPriceData.push({
            name: `${c.brandName || ''} — ${(c.productName || '').substring(0, 20)}`,
            price: parseFloat(c.price),
            isYou: false
        }));
        allPriceData.sort((a, b) => a.price - b.price);

        const maxPrice = Math.max(...allPriceData.map(p => p.price));
        const chartEl = document.getElementById("pcChart");
        chartEl.innerHTML = allPriceData.map(p => {
            const pct = (p.price / maxPrice) * 100;
            const barClass = p.isYou ? "pc-bar-you" : "pc-bar-comp";
            const labelClass = p.isYou ? "pc-bar-label-you" : "";
            const star = p.isYou ? " ⭐" : "";
            return `
        <div class="pc-bar-row">
          <span class="pc-bar-label ${labelClass}" title="${p.name}">${p.name}${star}</span>
          <div class="pc-bar-track">
            <div class="pc-bar-fill ${barClass}" style="width: ${pct}%"></div>
          </div>
          <span class="pc-bar-price">$${p.price.toFixed(2)}</span>
        </div>
      `;
        }).join("");

        // Insights
        const insightsEl = document.getElementById("pcInsights");
        let insights = [];

        if (diffPct > 10) {
            insights.push(`<div class="pc-insight pc-insight-warn">⚠️ <strong>Price Alert:</strong> You're ${diffPct.toFixed(0)}% above the competitor average. This may impact sell-through velocity at retail. Consider if your brand positioning justifies the premium.</div>`);
        } else if (diffPct < -10) {
            insights.push(`<div class="pc-insight pc-insight-info">💡 <strong>Margin Check:</strong> You're ${Math.abs(diffPct).toFixed(0)}% below competitors. Great for velocity, but verify your margins are sustainable at this price point.</div>`);
        } else {
            insights.push(`<div class="pc-insight pc-insight-good">✅ <strong>Competitive:</strong> Your pricing is within ${Math.abs(diffPct).toFixed(0)}% of the market average — well-positioned for balanced velocity and margin.</div>`);
        }

        if (yourPrice === minComp || yourPrice < minComp) {
            insights.push(`<div class="pc-insight pc-insight-info">📉 You have the <strong>lowest price</strong> in this comparison set.</div>`);
        } else if (yourPrice === maxComp || yourPrice > maxComp) {
            insights.push(`<div class="pc-insight pc-insight-warn">📈 You have the <strong>highest price</strong> in this comparison set.</div>`);
        }

        const priceSpread = maxComp - minComp;
        if (priceSpread > 0) {
            const yourPosition = ((yourPrice - minComp) / priceSpread) * 100;
            insights.push(`<div class="pc-insight pc-insight-neutral">📊 Market spread: $${minComp.toFixed(2)} – $${maxComp.toFixed(2)} (range: $${priceSpread.toFixed(2)}). You're at the ${yourPosition.toFixed(0)}% mark.</div>`);
        }

        // PPG insight
        const ppgs = validComps.filter(c => c.ppg > 0).map(c => c.ppg);
        if (ppgs.length > 0) {
            const avgPPG = ppgs.reduce((a, b) => a + b, 0) / ppgs.length;
            insights.push(`<div class="pc-insight pc-insight-neutral">💰 Average Price-Per-Gram in this market: <strong>$${avgPPG.toFixed(2)}/g</strong></div>`);
        }

        // Discount chain dominance warning
        const saleCount = validComps.filter(c => c.isSale).length;
        if (saleCount > 0) {
            insights.push(`<div class="pc-insight pc-insight-warn">⚠️ ${saleCount} of ${validComps.length} competitors are currently on <strong>Sale/Clearance</strong> — this may be skewing market averages down.</div>`);
        }

        insightsEl.innerHTML = insights.join("");

        // Market range bar
        const category = document.getElementById("pcCategory").value;
        const range = CATEGORY_RANGES[category];
        if (range) {
            const rangeMax = range.premium * 1.3;
            const budgetPct = (range.budget / rangeMax) * 100;
            const avgPct = (range.avg / rangeMax) * 100;
            const premPct = (range.premium / rangeMax) * 100;
            const yourPct = Math.min((yourPrice / rangeMax) * 100, 100);

            document.getElementById("pcMarketRange").innerHTML = `
        <div class="pc-range-bar">
          <div class="pc-range-zone pc-zone-budget" style="width: ${budgetPct}%"></div>
          <div class="pc-range-zone pc-zone-mid" style="width: ${avgPct - budgetPct}%"></div>
          <div class="pc-range-zone pc-zone-premium" style="width: ${premPct - avgPct}%"></div>
          <div class="pc-range-zone pc-zone-ultra" style="width: ${100 - premPct}%"></div>
          <div class="pc-range-marker" style="left: ${yourPct}%">
            <div class="pc-range-marker-dot"></div>
            <span class="pc-range-marker-label">You</span>
          </div>
        </div>
        <div class="pc-range-labels">
          <span>Budget<br>$${range.budget.toFixed(2)}${range.unit}</span>
          <span>Market Avg<br>$${range.avg.toFixed(2)}${range.unit}</span>
          <span>Premium<br>$${range.premium.toFixed(2)}${range.unit}</span>
        </div>
      `;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DATA FETCHING & EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════

    async function fetchProducts(searchQuery, isBrandSearch) {
        const loading = document.getElementById("pcLoadingState");
        const termDisplay = document.getElementById("pcSearchTermDisplay");
        const sizeInput = document.getElementById("pcWeight").value.trim();
        const provinceInput = document.getElementById("pcScrapeProvince").value;

        loading.style.display = "flex";
        termDisplay.textContent = isBrandSearch ? searchQuery : `Discovering: ${searchQuery}`;

        try {
            let url = `/api/scrape?brand=${encodeURIComponent(searchQuery)}&province=${encodeURIComponent(provinceInput)}`;
            if (sizeInput) url += `&size=${encodeURIComponent(sizeInput)}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.success && data.products && data.products.length > 0) {
                const yourPrice = parseFloat(document.getElementById("pcYourPrice").value) || 0;
                const qualityTier = document.getElementById("pcQualityTier").value;
                const minTHC = parseFloat(document.getElementById("pcMinTHC").value) || 0;
                const yourSize = document.getElementById("pcWeight").value.trim();
                const totalFound = data.products.length;

                // Apply relevance filtering
                let filtered;
                if (qualityTier === 'all' && !minTHC) {
                    // No filtering, just sort by price proximity
                    filtered = data.products.map(p => ({
                        ...p,
                        relevance: yourPrice > 0
                            ? Math.round(Math.max(1, 100 - (Math.abs(parseFloat(p.price) - yourPrice) / yourPrice) * 100))
                            : 0,
                        _totalBeforeFilter: totalFound
                    })).sort((a, b) => b.relevance - a.relevance);
                } else {
                    filtered = filterByRelevance(data.products, yourPrice, qualityTier, minTHC, yourSize);
                    filtered = filtered.map(p => ({ ...p, _totalBeforeFilter: totalFound }));
                }

                if (filtered.length === 0) {
                    // Fallback: show all but warn
                    filtered = data.products.map(p => ({ ...p, relevance: 0, _totalBeforeFilter: totalFound }));
                    alert(`No products matched your quality/price tier. Showing all ${totalFound} results unfiltered. Try adjusting your Quality Tier or Minimum THC.`);
                }

                allProducts = filtered;
                competitors = filtered.slice(0, 50);
                saveState();
                renderMarketOverview(allProducts);
                renderScatterPlot(allProducts);
                updateComparison();
            } else {
                alert(data.error || "No products found. Try adjusting your search.");
            }
        } catch (err) {
            alert("Network error fetching from hibuddy API. Please try again.");
            console.error("Fetch Error:", err);
        } finally {
            loading.style.display = "none";
        }
    }

    // Initialize
    document.addEventListener("DOMContentLoaded", () => {
        loadState();

        // If we have saved competitors, render them
        if (competitors.length > 0 && competitors[0].brand) {
            allProducts = competitors;
            renderMarketOverview(allProducts);
            renderScatterPlot(allProducts);
        }

        // Brand Search (Fetch Prices)
        document.getElementById("pcAutoSearchBtn").addEventListener("click", async () => {
            const btn = document.getElementById("pcAutoSearchBtn");
            const brand = document.getElementById("pcAutoSearch").value.trim();
            if (!brand) return alert("Please enter a brand name to search (e.g. Tribal).");
            btn.disabled = true;
            await fetchProducts(brand, true);
            btn.disabled = false;
            document.getElementById("pcAutoSearch").value = "";
        });

        // Discover Competitors (Multi-query: category + tier-specific brands)
        document.getElementById("pcDiscoverBtn").addEventListener("click", async () => {
            const btn = document.getElementById("pcDiscoverBtn");
            const catEl = document.getElementById("pcCategory");
            const sizeInput = document.getElementById("pcWeight").value.trim();
            const qualityTier = document.getElementById("pcQualityTier").value;
            const catTerm = CATEGORY_SEARCH[catEl.value] || "flower";
            const provinceInput = document.getElementById("pcScrapeProvince").value;
            const loading = document.getElementById("pcLoadingState");
            const termDisplay = document.getElementById("pcSearchTermDisplay");

            btn.disabled = true;
            loading.style.display = "flex";

            // Tier-specific brand keywords to supplement generic search
            const TIER_BRANDS = {
                budget: ["Good Supply", "Shred", "Original Stash", "Daily Special", "Twd"],
                mid: ["Spinach", "RIFF", "Back Forty", "Verse", "Palmetto"],
                premium: ["Simply Bare", "Carmel", "Tribal", "BLKMKT", "Gage", "Qwest"],
                ultra_premium: ["Broken Coast", "OGEN", "Cookies", "Ghost Drops", "Greybeard"],
                all: []
            };

            const brandList = TIER_BRANDS[qualityTier] || [];

            // Build search queries: 1 generic + up to 4 brand-specific
            const queries = [];
            const genericQuery = sizeInput ? `${catTerm} ${sizeInput}` : catTerm;
            queries.push(genericQuery);
            // Add top brand queries (limit to 4 for speed)
            brandList.slice(0, 4).forEach(b => {
                queries.push(sizeInput ? `${b} ${sizeInput}` : b);
            });

            termDisplay.textContent = `Discovering ${queries.length} searches: ${genericQuery}...`;

            try {
                // Run all searches in parallel
                const fetches = queries.map(q => {
                    let url = `/api/scrape?brand=${encodeURIComponent(q)}&province=${encodeURIComponent(provinceInput)}`;
                    if (sizeInput) url += `&size=${encodeURIComponent(sizeInput)}`;
                    return fetch(url).then(r => r.json()).catch(() => ({ success: false, products: [] }));
                });

                const results = await Promise.all(fetches);

                // Merge & deduplicate by productId
                const productMap = new Map();
                results.forEach(data => {
                    if (data.success && data.products) {
                        data.products.forEach(p => {
                            const key = p.productId || `${p.brandName}-${p.productName}-${p.price}`;
                            if (!productMap.has(key)) productMap.set(key, p);
                        });
                    }
                });

                const allMerged = Array.from(productMap.values());

                if (allMerged.length > 0) {
                    const yourPrice = parseFloat(document.getElementById("pcYourPrice").value) || 0;
                    const minTHC = parseFloat(document.getElementById("pcMinTHC").value) || 0;
                    const yourSize = document.getElementById("pcWeight").value.trim();
                    const totalFound = allMerged.length;

                    // Apply relevance filtering
                    let filtered;
                    if (qualityTier === 'all' && !minTHC) {
                        filtered = allMerged.map(p => ({
                            ...p,
                            relevance: yourPrice > 0
                                ? Math.round(Math.max(1, 100 - (Math.abs(parseFloat(p.price) - yourPrice) / yourPrice) * 100))
                                : 0,
                            _totalBeforeFilter: totalFound
                        })).sort((a, b) => b.relevance - a.relevance);
                    } else {
                        filtered = filterByRelevance(allMerged, yourPrice, qualityTier, minTHC, yourSize);
                        filtered = filtered.map(p => ({ ...p, _totalBeforeFilter: totalFound }));
                    }

                    if (filtered.length === 0) {
                        filtered = allMerged.map(p => ({ ...p, relevance: 0, _totalBeforeFilter: totalFound }));
                        alert(`No products matched your quality/price tier. Showing all ${totalFound} results unfiltered.`);
                    }

                    allProducts = filtered;
                    competitors = filtered.slice(0, 50);
                    saveState();
                    renderMarketOverview(allProducts);
                    renderScatterPlot(allProducts);
                    updateComparison();
                } else {
                    alert("No products found. Try adjusting your search.");
                }
            } catch (err) {
                alert("Network error fetching from hibuddy API. Please try again.");
                console.error("Discover Error:", err);
            } finally {
                loading.style.display = "none";
                btn.disabled = false;
            }
        });

        // Generate Pitch Report (PDF Export)
        document.getElementById("pcExportPdfBtn").addEventListener("click", () => {
            const btn = document.getElementById("pcExportPdfBtn");
            const originalText = btn.innerHTML;
            btn.innerHTML = "⏳ Generating PDF...";
            btn.disabled = true;

            const source = document.querySelector(".pc-page");
            if (!source) return;

            const wrapper = document.createElement("div");
            wrapper.style.cssText = "padding:32px; font-family: 'Poppins', sans-serif; color:#1e293b; background:#fff;";

            const productName = document.getElementById("pcProductName").value || "Cannabis Product";
            const category = document.getElementById("pcCategory").options[document.getElementById("pcCategory").selectedIndex].text;
            const weight = document.getElementById("pcWeight").value || "-";
            const yourPrice = parseFloat(document.getElementById("pcYourPrice").value) || 0;
            const dateStr = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

            wrapper.innerHTML = `
              <div style="border-bottom: 3px solid #10b981; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                  <h1 style="margin: 0; font-size: 28px; color: #10b981; font-weight: 700;">Retail Market Analysis</h1>
                  <h2 style="margin: 8px 0 0; font-size: 18px; color: #334155;">${productName}</h2>
                </div>
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 14px; color: #64748b; font-weight: 600;">${category} • ${weight}</p>
                  <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">Target MSRP: $${yourPrice.toFixed(2)}</p>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">${dateStr}</p>
                </div>
              </div>
            `;

            const clone = source.cloneNode(true);
            const elementsToRemove = clone.querySelectorAll('.pc-export-btn, .pc-add-btn, .pc-remove-btn, .pc-auto-fill-group, .ci-card-expand, .ci-scatter-tooltip');
            elementsToRemove.forEach(el => el.remove());

            clone.querySelectorAll('input, select').forEach(input => {
                const val = input.value || input.options?.[input.selectedIndex]?.text || '';
                const span = document.createElement('span');
                span.textContent = val;
                span.style.cssText = "display: inline-block; padding: 4px 8px; font-weight: 600; color: #0f172a;";
                input.parentNode.replaceChild(span, input);
            });

            wrapper.appendChild(clone);

            const footer = document.createElement("div");
            footer.style.cssText = "margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;";
            footer.innerHTML = "Generated via <strong>Cannabis Pricing & Strategy Engine</strong> • Prices sourced real-time from compiled retail data.";
            wrapper.appendChild(footer);

            const filename = `Pitch_Report_${productName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;

            html2pdf().set({
                margin: [10, 10, 10, 10],
                filename,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 1200 },
                jsPDF: { unit: "mm", format: "letter", orientation: "portrait" }
            }).from(wrapper).save().then(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }).catch(err => {
                console.error("PDF Gen Error", err);
                btn.innerHTML = "❌ Export Failed";
                setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 3000);
            });
        });

        // Save your product on change
        ["pcProductName", "pcCategory", "pcWeight", "pcYourPrice", "pcQualityTier", "pcMinTHC"].forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener("input", () => { saveState(); updateComparison(); });
            el.addEventListener("change", () => { saveState(); updateComparison(); });
        });

        // Initial render if data exists
        updateComparison();
    });

})();
