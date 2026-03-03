// ============================================================
// Price Comparison Tool
// Competitor price comparison with visual charts and insights
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

    // Persistent state
    let competitors = [];
    const STORAGE_KEY = "pc_competitors";
    const YOUR_STORAGE_KEY = "pc_your_product";

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
                const nameEl = document.getElementById("pcProductName");
                const catEl = document.getElementById("pcCategory");
                const weightEl = document.getElementById("pcWeight");
                const priceEl = document.getElementById("pcYourPrice");
                if (y.name) nameEl.value = y.name;
                if (y.category) catEl.value = y.category;
                if (y.weight) weightEl.value = y.weight;
                if (y.price) priceEl.value = y.price;
            }
        } catch (e) { /* ignore */ }
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(competitors));
        const yourData = {
            name: document.getElementById("pcProductName").value,
            category: document.getElementById("pcCategory").value,
            weight: document.getElementById("pcWeight").value,
            price: document.getElementById("pcYourPrice").value
        };
        localStorage.setItem(YOUR_STORAGE_KEY, JSON.stringify(yourData));
    }

    // Render competitor rows
    function renderCompetitorRows() {
        const container = document.getElementById("pcCompetitorRows");
        container.innerHTML = "";

        if (competitors.length === 0) {
            // Add 2 empty rows by default
            competitors.push({ brand: "", price: "", source: "hibuddy.ca" });
            competitors.push({ brand: "", price: "", source: "hibuddy.ca" });
        }

        competitors.forEach((comp, idx) => {
            const row = document.createElement("div");
            row.className = "pc-comp-row";
            row.innerHTML = `
        <input type="text" class="pc-comp-brand" placeholder="e.g. Pure Sunfarms Pink Kush" 
               value="${comp.brand}" data-idx="${idx}">
        <input type="number" class="pc-comp-price" placeholder="$0.00" min="0" step="0.01" 
               value="${comp.price}" data-idx="${idx}">
        <select class="pc-comp-source" data-idx="${idx}">
          <option value="hibuddy.ca" ${comp.source === "hibuddy.ca" ? "selected" : ""}>hibuddy.ca</option>
          <option value="OCS.ca" ${comp.source === "OCS.ca" ? "selected" : ""}>OCS.ca</option>
          <option value="In-store" ${comp.source === "In-store" ? "selected" : ""}>In-store</option>
          <option value="Other" ${comp.source === "Other" ? "selected" : ""}>Other</option>
        </select>
        <button class="pc-comp-remove" data-idx="${idx}" title="Remove">✕</button>
      `;
            container.appendChild(row);
        });

        // Bind events
        container.querySelectorAll(".pc-comp-brand").forEach(el => {
            el.addEventListener("input", e => {
                competitors[e.target.dataset.idx].brand = e.target.value;
                saveState();
                updateComparison();
            });
        });
        container.querySelectorAll(".pc-comp-price").forEach(el => {
            el.addEventListener("input", e => {
                competitors[e.target.dataset.idx].price = e.target.value;
                saveState();
                updateComparison();
            });
        });
        container.querySelectorAll(".pc-comp-source").forEach(el => {
            el.addEventListener("change", e => {
                competitors[e.target.dataset.idx].source = e.target.value;
                saveState();
            });
        });
        container.querySelectorAll(".pc-comp-remove").forEach(el => {
            el.addEventListener("click", e => {
                competitors.splice(parseInt(e.target.dataset.idx), 1);
                saveState();
                renderCompetitorRows();
                updateComparison();
            });
        });
    }

    // Update comparison visualization
    function updateComparison() {
        const yourPrice = parseFloat(document.getElementById("pcYourPrice").value);
        const validComps = competitors.filter(c => c.brand.trim() && parseFloat(c.price) > 0);
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

        // Chart — horizontal bar chart
        const allPrices = [{ name: document.getElementById("pcProductName").value || "Your Product", price: yourPrice, isYou: true }];
        validComps.forEach(c => allPrices.push({ name: c.brand, price: parseFloat(c.price), isYou: false }));
        allPrices.sort((a, b) => a.price - b.price);

        const maxPrice = Math.max(...allPrices.map(p => p.price));
        const chartEl = document.getElementById("pcChart");
        chartEl.innerHTML = allPrices.map(p => {
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

    // Initialize
    document.addEventListener("DOMContentLoaded", () => {
        loadState();
        renderCompetitorRows();

        // Add competitor button
        document.getElementById("pcAddCompetitor").addEventListener("click", () => {
            if (competitors.length >= 10) return;
            competitors.push({ brand: "", price: "", source: "hibuddy.ca" });
            saveState();
            renderCompetitorRows();
        });

        // Save your product on change
        ["pcProductName", "pcCategory", "pcWeight", "pcYourPrice"].forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener("input", () => { saveState(); updateComparison(); });
            el.addEventListener("change", () => { saveState(); updateComparison(); });
        });

        // Initial render if data exists
        updateComparison();
    });

})();
