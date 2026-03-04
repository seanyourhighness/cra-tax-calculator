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
        <div class="pc-comp-brand-cell" style="display: flex; flex-direction: column;">
            <input type="text" class="pc-comp-brand" placeholder="e.g. Pure Sunfarms Pink Kush" 
                   value="${comp.brand}" data-idx="${idx}">
            ${(comp.strain || comp.size || comp.formFactor || comp.isSale) ? `
            <div style="font-size: 10px; color: #94a3b8; margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;">
                ${comp.strain && comp.strain !== comp.brand ? `<span style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">🌿 ${comp.strain}</span>` : ''}
                ${comp.formFactor && comp.formFactor !== 'Unknown' ? `<span style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">📦 ${comp.formFactor}</span>` : ''}
                ${comp.size && comp.size !== 'Unknown' ? `<span style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">⚖️ ${comp.size}</span>` : ''}
                ${comp.isSale ? `<span style="background: rgba(239,68,68,0.15); color: #fca5a5; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid rgba(239,68,68,0.3);">⚠️ SALE / CLEARANCE</span>` : ''}
            </div>` : ''}
        </div>
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

        // Auto-Fill from Hibuddy
        document.getElementById("pcAutoSearchBtn").addEventListener("click", async () => {
            const input = document.getElementById("pcAutoSearch");
            const btn = document.getElementById("pcAutoSearchBtn");
            const loading = document.getElementById("pcLoadingState");
            const termDisplay = document.getElementById("pcSearchTermDisplay");

            const brand = input.value.trim();
            if (!brand) return alert("Please enter a brand name to search (e.g. Tribal).");

            // Get additional filters
            const sizeInput = document.getElementById("pcWeight").value.trim();
            const provinceInput = document.getElementById("pcScrapeProvince").value;

            // UI State
            btn.disabled = true;
            loading.style.display = "flex";
            termDisplay.textContent = brand;

            try {
                // Build dynamic URL with filters
                let url = `/api/scrape?brand=${encodeURIComponent(brand)}&province=${encodeURIComponent(provinceInput)}`;
                if (sizeInput) url += `&size=${encodeURIComponent(sizeInput)}`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.success && data.products && data.products.length > 0) {
                    // Populate competitors array with top results
                    // We only take the top 10 to fit the UI limits
                    competitors = data.products.slice(0, 10).map(p => ({
                        brand: p.name, // Display the product strain/name in the main column
                        strain: p.strain || '',
                        formFactor: p.formFactor || '',
                        size: p.size || '',
                        isSale: p.isSale || false,
                        price: p.price.toFixed(2),
                        source: "hibuddy.ca"
                    }));

                    saveState();
                    renderCompetitorRows();
                    updateComparison();
                    input.value = ""; // Clear input on success
                } else {
                    alert(data.error || "No products found for that brand on hibuddy.");
                }
            } catch (err) {
                alert("Network error fetching from hibuddy API. Please try again.");
                console.error("Scrape API Error:", err);
            } finally {
                btn.disabled = false;
                loading.style.display = "none";
            }
        });

        // Generate Pitch Report (PDF Export)
        document.getElementById("pcExportPdfBtn").addEventListener("click", () => {
            const btn = document.getElementById("pcExportPdfBtn");
            const originalText = btn.innerHTML;
            btn.innerHTML = "⏳ Generating PDF...";
            btn.disabled = true;

            // Target the entire Price Comparison page
            const source = document.querySelector(".pc-page");
            if (!source) return;

            // Build a clean wrapper for printing
            const wrapper = document.createElement("div");
            wrapper.style.cssText = "padding:32px; font-family: 'Poppins', sans-serif; color:#1e293b; background:#fff;";

            // Get current setup details
            const productName = document.getElementById("pcProductName").value || "Cannabis Product";
            const category = document.getElementById("pcCategory").options[document.getElementById("pcCategory").selectedIndex].text;
            const weight = document.getElementById("pcWeight").value || "-";
            const yourPrice = parseFloat(document.getElementById("pcYourPrice").value) || 0;
            const dateStr = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

            // Create professional header
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

            // Clone the actual UI content
            const clone = source.cloneNode(true);

            // Cleanup UI elements that shouldn't be printed
            const elementsToRemove = clone.querySelectorAll('.pc-export-btn, .pc-add-btn, .pc-remove-btn, .pc-auto-fill-group');
            elementsToRemove.forEach(el => el.remove());

            // Fix input fields to appear as static text for the PDF
            clone.querySelectorAll('input, select').forEach(input => {
                const val = input.value || input.options?.[input.selectedIndex]?.text || '';
                const span = document.createElement('span');
                span.textContent = val;
                span.style.cssText = "display: inline-block; padding: 4px 8px; font-weight: 600; color: #0f172a;";
                input.parentNode.replaceChild(span, input);
            });

            // Ensure chart renders properly (convert height mapping)
            clone.querySelectorAll('.pc-chart-bar-fill').forEach(bar => {
                // Ensure percentage heights are inline so html2canvas picks them up
                bar.style.height = bar.style.height;
            });

            wrapper.appendChild(clone);

            // Add Footer
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
        ["pcProductName", "pcCategory", "pcWeight", "pcYourPrice"].forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener("input", () => { saveState(); updateComparison(); });
            el.addEventListener("change", () => { saveState(); updateComparison(); });
        });

        // Initial render if data exists
        updateComparison();
    });

})();
