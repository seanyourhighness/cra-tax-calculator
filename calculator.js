// ============================================================
// CRA Cannabis End-to-End Pricing Calculator
// LP Cost → Excise → Landed Cost → Wholesale → Retail → Consumer
// ============================================================

// ============================================================
// Product Type Definitions
// ============================================================

const PRODUCT_TYPES = {
  dried_flower: {
    label: "Dried Flower",
    unit: "grams", unitLabel: "g",
    method: "higher_of",
    federalFlat: 0.25, federalAdValorem: 0.025,
    provincialFlat: 0.75, provincialAdValorem: 0.075,
    needsTHC: false,
    ocsMarkup: 0.23, priceFloor: 1.85,
    icon: "🌿"
  },
  trim: {
    label: "Trim / Non-Flowering",
    unit: "grams", unitLabel: "g",
    method: "higher_of",
    federalFlat: 0.075, federalAdValorem: 0.025,
    provincialFlat: 0.225, provincialAdValorem: 0.075,
    needsTHC: false,
    ocsMarkup: 0.23, priceFloor: null,
    icon: "🍃"
  },
  prerolls: {
    label: "Pre-Rolls",
    unit: "grams", unitLabel: "g",
    method: "higher_of",
    federalFlat: 0.25, federalAdValorem: 0.025,
    provincialFlat: 0.75, provincialAdValorem: 0.075,
    needsTHC: false,
    ocsMarkup: 0.29, priceFloor: 1.76,
    icon: "🚬"
  },
  infused_prerolls: {
    label: "Infused Pre-Rolls",
    unit: "grams", unitLabel: "g",
    method: "higher_of",
    federalFlat: 0.25, federalAdValorem: 0.025,
    provincialFlat: 0.75, provincialAdValorem: 0.075,
    needsTHC: false,
    ocsMarkup: 0.29, priceFloor: 1.76,
    icon: "✨"
  },
  vapes: {
    label: "Vapes",
    unit: "grams", unitLabel: "g",
    method: "thc_flat",
    federalPerMgTHC: 0.0025, provincialPerMgTHC: 0.0075,
    needsTHC: true,
    ocsMarkup: 0.25, priceFloor: 15.25, priceFloorMaxG: 1,
    icon: "💨"
  },
  edibles: {
    label: "Edibles",
    unit: "units", unitLabel: "units",
    method: "thc_flat",
    federalPerMgTHC: 0.0025, provincialPerMgTHC: 0.0075,
    needsTHC: true,
    ocsMarkup: 0.25, priceFloor: null,
    icon: "🍫"
  },
  extracts: {
    label: "Extracts / Concentrates",
    unit: "grams", unitLabel: "g",
    method: "thc_flat",
    federalPerMgTHC: 0.0025, provincialPerMgTHC: 0.0075,
    needsTHC: true,
    ocsMarkup: 0.25, priceFloor: null,
    icon: "💎"
  },
  oils: {
    label: "Cannabis Oils",
    unit: "units", unitLabel: "units",
    method: "thc_flat",
    federalPerMgTHC: 0.0025, provincialPerMgTHC: 0.0075,
    needsTHC: true,
    ocsMarkup: 0.25, priceFloor: null,
    icon: "💧"
  },
  topicals: {
    label: "Topicals",
    unit: "units", unitLabel: "units",
    method: "thc_flat",
    federalPerMgTHC: 0.0025, provincialPerMgTHC: 0.0075,
    needsTHC: true,
    ocsMarkup: 0.25, priceFloor: null,
    icon: "🧴"
  },
  beverages: {
    label: "Beverages",
    unit: "units", unitLabel: "units",
    method: "thc_flat",
    federalPerMgTHC: 0.0025, provincialPerMgTHC: 0.0075,
    needsTHC: true,
    ocsMarkup: 0.25, priceFloor: null,
    icon: "🥤"
  },
  capsules: {
    label: "Capsules",
    unit: "units", unitLabel: "units",
    method: "thc_flat",
    federalPerMgTHC: 0.0025, provincialPerMgTHC: 0.0075,
    needsTHC: true,
    ocsMarkup: 0.25, priceFloor: null,
    icon: "💊"
  },
  plants: {
    label: "Cannabis Plants",
    unit: "plants", unitLabel: "plants",
    method: "higher_of",
    federalFlat: 0.25, federalAdValorem: 0.025,
    provincialFlat: 0.75, provincialAdValorem: 0.075,
    needsTHC: false,
    ocsMarkup: 0.25, priceFloor: null,
    icon: "🌱"
  },
  seeds: {
    label: "Cannabis Seeds",
    unit: "seeds", unitLabel: "seeds",
    method: "higher_of",
    federalFlat: 0.25, federalAdValorem: 0.025,
    provincialFlat: 0.75, provincialAdValorem: 0.075,
    needsTHC: false,
    ocsMarkup: 0.25, priceFloor: null,
    icon: "🫘"
  }
};

// ============================================================
// Province Definitions
// ============================================================

const PROVINCES = {
  ON: {
    name: "Ontario", flag: "🍁",
    adjustmentRate: 0.039, coordinated: true,
    salesTaxRate: 0.13, salesTaxLabel: "HST (13%)",
    wholesaleMarkup: null, // uses OCS category markup
    wholesaleMarkupLabel: "OCS Wholesale Markup"
  },
  AB: {
    name: "Alberta", flag: "🏔️",
    adjustmentRate: 0.168, coordinated: true,
    salesTaxRate: 0.05, salesTaxLabel: "GST (5%)",
    wholesaleMarkup: 0.06,
    wholesaleMarkupLabel: "AGLC 6% Ad Valorem Markup"
  },
  BC: {
    name: "British Columbia", flag: "🌲",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.12, salesTaxLabel: "GST + PST (5% + 7%)",
    wholesaleMarkup: 0.15,
    wholesaleMarkupLabel: "BCLDB 15% Wholesale Markup"
  },
  QC: {
    name: "Quebec", flag: "⚜️",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.14975, salesTaxLabel: "GST + QST (5% + 9.975%)",
    wholesaleMarkup: 0.20,
    wholesaleMarkupLabel: "SQDC Markup (~20%)"
  },
  SK: {
    name: "Saskatchewan", flag: "🌾",
    adjustmentRate: 0.0645, coordinated: true,
    salesTaxRate: 0.11, salesTaxLabel: "GST + PST (5% + 6%)",
    wholesaleMarkup: 0.0,
    wholesaleMarkupLabel: "Direct-to-Retail (0% Wholesale)"
  },
  MB: {
    name: "Manitoba", flag: "🦬",
    adjustmentRate: 0, coordinated: false,
    salesTaxRate: 0.12, salesTaxLabel: "GST + RST (5% + 7%)",
    wholesaleMarkup: 0.09,
    wholesaleMarkupLabel: "MBLL 9% Markup",
    mbSocialResp: 0.06,
    mbSRFLabel: "6% Social Responsibility Fee"
  },
  NB: {
    name: "New Brunswick", flag: "⚓",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.15, salesTaxLabel: "HST (15%)",
    wholesaleMarkup: 0.20,
    wholesaleMarkupLabel: "Cannabis NB Markup (~20%)"
  },
  NL: {
    name: "Newfoundland & Labrador", flag: "🐟",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.15, salesTaxLabel: "HST (15%)",
    wholesaleMarkup: 0.0225,
    wholesaleMarkupLabel: "NLC 2.25% Consignment Fee"
  },
  NS: {
    name: "Nova Scotia", flag: "⚓",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.14, salesTaxLabel: "HST (14%)",
    wholesaleMarkup: 0.20,
    wholesaleMarkupLabel: "NSLC Markup (~20%)"
  },
  PE: {
    name: "Prince Edward Island", flag: "🥔",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.15, salesTaxLabel: "HST (15%)",
    wholesaleMarkup: 0.20,
    wholesaleMarkupLabel: "PEI Cannabis Markup (~20%)"
  },
  NT: {
    name: "Northwest Territories", flag: "❄️",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.05, salesTaxLabel: "GST (5%)",
    wholesaleMarkup: 0.34,
    wholesaleMarkupLabel: "NTLL 34% Standard Markup"
  },
  NU: {
    name: "Nunavut", flag: "🏔️",
    adjustmentRate: 0.193, coordinated: true,
    salesTaxRate: 0.05, salesTaxLabel: "GST (5%)",
    wholesaleMarkup: 0,
    wholesaleMarkupLabel: "NULC ($1/g Flat Retail Markup)",
    nuFlatRetail: 1.00
  },
  YT: {
    name: "Yukon", flag: "🐻",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.05, salesTaxLabel: "GST (5%)",
    wholesaleMarkup: 0.235,
    wholesaleMarkupLabel: "YLC 20% Markup + 3.5% Logistics"
  }
};

// ============================================================
// Calculation Engine
// ============================================================

function calculate(productTypeKey, provinceKey, quantity, thcMg, lpCost, retailMarkupPct) {
  const product = PRODUCT_TYPES[productTypeKey];
  const province = PROVINCES[provinceKey];
  if (!product || !province) return null;

  const r = {
    productType: product.label,
    province: province.name,
    quantity, thcMg, lpCost, retailMarkupPct,

    // Stage 1: Excise
    federalFlatDuty: 0, federalAdValoremDuty: 0,
    federalDuty: 0, federalMethod: "",
    provincialFlatDuty: 0, provincialAdValoremDuty: 0,
    provincialBaseDuty: 0, provincialMethod: "",
    adjustmentRate: 0, adjustmentAmount: 0,
    totalProvincialDuty: 0, totalExciseDuty: 0,

    // Stage 2: Landed Cost
    landedCost: 0,

    // Stage 3: Wholesale
    wholesaleMarkupRate: 0, wholesaleMarkupLabel: "",
    wholesaleMarkupAmount: 0, wholesalePrice: 0,

    // MB specifics
    mbSRFAmount: 0,

    // Stage 4: Retail
    preTaxRetailPrice: 0,

    // Stage 5: Sales Tax
    salesTaxRate: province.salesTaxRate, salesTaxLabel: province.salesTaxLabel,
    salesTaxAmount: 0,

    // Final
    consumerPrice: 0,

    // Price floor
    priceFloorWarning: null,
    priceFloorValue: 0,

    // Per-unit metrics
    excisePerUnit: 0, totalTaxPerUnit: 0, effectiveTaxRate: 0
  };

  // ── Stage 1: CRA Excise Duty ──

  // For "higher_of" products, the dutiable amount is the LP's selling price
  // to the provincial distributor, which = lpCost (their cost basis / desired sell price)
  const dutiableAmount = lpCost;

  if (product.method === "higher_of") {
    r.federalFlatDuty = product.federalFlat * quantity;
    r.federalAdValoremDuty = product.federalAdValorem * dutiableAmount;

    if (r.federalAdValoremDuty > r.federalFlatDuty) {
      r.federalDuty = r.federalAdValoremDuty;
      r.federalMethod = "Ad Valorem (higher)";
    } else {
      r.federalDuty = r.federalFlatDuty;
      r.federalMethod = r.federalFlatDuty === r.federalAdValoremDuty
        ? "Flat Rate (equal)" : "Flat Rate (higher)";
    }
  } else {
    r.federalDuty = product.federalPerMgTHC * thcMg;
    r.federalMethod = "THC Flat Rate";
  }

  // Provincial duty
  if (province.coordinated) {
    if (product.method === "higher_of") {
      r.provincialFlatDuty = product.provincialFlat * quantity;
      r.provincialAdValoremDuty = product.provincialAdValorem * dutiableAmount;

      // CRA: adjustment is ALWAYS applied to the dutiable amount (base amount / selling price),
      // regardless of whether flat or ad valorem wins the "higher of" test.
      // Reference: Excise Act 2001 s.158.22, CRA EDN71
      r.adjustmentAmount = province.adjustmentRate * dutiableAmount;

      // Compare: flat + adj vs ad valorem + adj
      const flatPlusAdj = r.provincialFlatDuty + r.adjustmentAmount;
      const adValoremPlusAdj = r.provincialAdValoremDuty + r.adjustmentAmount;

      if (r.provincialAdValoremDuty > r.provincialFlatDuty) {
        r.provincialBaseDuty = r.provincialAdValoremDuty;
        r.totalProvincialDuty = adValoremPlusAdj;
        r.provincialMethod = "Ad Valorem + Adj. (higher)";
      } else {
        r.provincialBaseDuty = r.provincialFlatDuty;
        r.totalProvincialDuty = flatPlusAdj;
        r.provincialMethod = "Flat Rate + Adj. (higher)";
      }
    } else {
      r.provincialBaseDuty = product.provincialPerMgTHC * thcMg;
      // For THC-based products, adjustment is also on the base amount.
      // base amount for THC products = the THC duty amount (since there's no selling-price-based calc)
      r.adjustmentAmount = province.adjustmentRate * dutiableAmount;
      r.totalProvincialDuty = r.provincialBaseDuty + r.adjustmentAmount;
      r.provincialMethod = "THC Flat Rate" + (province.adjustmentRate > 0 ? " + Adj." : "");
    }
    r.adjustmentRate = province.adjustmentRate;
  } else {
    // Manitoba — no CRA additional duty
    r.provincialBaseDuty = 0;
    r.totalProvincialDuty = 0;
    r.provincialMethod = "Non-coordinated";
  }

  r.totalExciseDuty = r.federalDuty + r.totalProvincialDuty;

  // ── Stage 2: Landed Cost ──
  r.landedCost = lpCost + r.totalExciseDuty;

  // ── Stage 3: Wholesale Price ──
  // Ontario uses OCS category-specific markups, others use province-level
  if (provinceKey === "ON") {
    r.wholesaleMarkupRate = product.ocsMarkup;
    r.wholesaleMarkupLabel = `OCS ${(product.ocsMarkup * 100).toFixed(0)}% Markup`;
  } else if (province.wholesaleMarkup !== null) {
    r.wholesaleMarkupRate = province.wholesaleMarkup;
    r.wholesaleMarkupLabel = province.wholesaleMarkupLabel;
  }

  r.wholesaleMarkupAmount = r.landedCost * r.wholesaleMarkupRate;
  r.wholesalePrice = r.landedCost + r.wholesaleMarkupAmount;

  // Manitoba SRF (on retailer revenue — approximate on wholesale price)
  if (province.mbSocialResp) {
    r.mbSRFAmount = r.wholesalePrice * province.mbSocialResp;
  }

  // ── Stage 4: Retail Price ──
  const retailBase = r.wholesalePrice + r.mbSRFAmount;
  r.preTaxRetailPrice = retailBase * (1 + retailMarkupPct);

  // ── Stage 5: Sales Tax ──
  r.salesTaxAmount = r.preTaxRetailPrice * province.salesTaxRate;
  r.consumerPrice = r.preTaxRetailPrice + r.salesTaxAmount;

  // Round consumer price to nearest $0.05 (OCS convention)
  r.consumerPrice = Math.ceil(r.consumerPrice / 0.05) * 0.05;

  // ── Price Floor Check ──
  if (product.priceFloor && quantity > 0) {
    const applyFloor = product.priceFloorMaxG ? (quantity <= product.priceFloorMaxG) : true;
    if (applyFloor) {
      r.priceFloorValue = product.priceFloor * quantity;
      const preTaxPerUnit = r.preTaxRetailPrice;
      if (preTaxPerUnit < r.priceFloorValue) {
        r.priceFloorWarning = `Below OCS price floor of $${product.priceFloor.toFixed(2)}/g (min $${r.priceFloorValue.toFixed(2)} excl. HST). Increase LP cost.`;
      }
    }
  }

  // ── Per-unit metrics ──
  if (quantity > 0) {
    r.excisePerUnit = r.totalExciseDuty / quantity;
  }
  const totalGovTake = r.totalExciseDuty + r.salesTaxAmount + r.wholesaleMarkupAmount + r.mbSRFAmount;
  if (lpCost > 0) {
    r.effectiveTaxRate = totalGovTake / lpCost;
  }
  r.totalTaxPerUnit = quantity > 0 ? totalGovTake / quantity : 0;

  return r;
}

// ============================================================
// Advanced Analytics Engine
// ============================================================

/**
 * Binary search solver to find the exact LP Selling Price required
 * to hit a target retail price on the shelf.
 */
function solveForSellingPrice(targetRetailPrice, productTypeKey, provinceKey, quantity, thcMg, retailMarkupPct) {
  // Edge cases
  if (targetRetailPrice <= 0) return 0;

  let low = 0.01;
  let high = targetRetailPrice; // LP cost can never be higher than final retail
  let bestGuess = 0;
  let iterations = 0;
  const maxIterations = 100;
  const tolerance = 0.01; // $0.01 accuracy

  while (low <= high && iterations < maxIterations) {
    iterations++;
    let mid = (low + high) / 2;

    // Simulate forward calculation with the guessed LP cost
    const sim = calculate(productTypeKey, provinceKey, quantity, thcMg, mid, retailMarkupPct);
    if (!sim) return 0;

    // We compare pre-rounding consumer price to avoid rounding step-function issues getting stuck
    // But realistically to hit a $29.99 shelf price exactly, we match against consumerPrice
    const currentSimulatedRetail = sim.consumerPrice;

    if (Math.abs(currentSimulatedRetail - targetRetailPrice) < tolerance) {
      bestGuess = mid;
      break; // Found it within tolerance
    } else if (currentSimulatedRetail < targetRetailPrice) {
      bestGuess = mid; // Save closest under-guess
      low = mid + 0.001; // Need a higher LP price
    } else {
      high = mid - 0.001; // Need a lower LP price
    }
  }

  return bestGuess;
}

/**
 * Calculates results for the given product profile across all 13 provinces/territories.
 */
function calculateAllProvinces(productTypeKey, quantity, thcMg, lpCost, retailMarkupPct) {
  const results = [];

  for (const provKey of Object.keys(PROVINCES)) {
    const res = calculate(productTypeKey, provKey, quantity, thcMg, lpCost, retailMarkupPct);
    if (res) {
      results.push(res);
    }
  }

  // Return sorted by retail price (lowest to highest) as a standard view
  return results.sort((a, b) => a.consumerPrice - b.consumerPrice);
}

/**
 * Calculates cost & margin analysis across all provinces.
 * Assumes COGS = costMarginPct × LP Cost (default 50%).
 * Excise is paid upfront (out of pocket).
 * Shows: COGS, excise, total out-of-pocket, LP revenue, net profit, true margin.
 */
function calculateMarginAnalysis(productTypeKey, quantity, thcMg, lpCost, retailMarkupPct, costMarginPct = 0.50) {
  const results = [];
  const cogs = lpCost * costMarginPct; // Cost of goods sold

  for (const provKey of Object.keys(PROVINCES)) {
    const r = calculate(productTypeKey, provKey, quantity, thcMg, lpCost, retailMarkupPct);
    if (!r) continue;

    const excise = r.totalExciseDuty;
    const totalOutOfPocket = cogs + excise;       // Total cash you spend to get product to distributor
    const landedAtDistributor = lpCost + excise;   // Value of product at distributor
    const lpRevenue = lpCost;                      // What the LP gets paid
    const netProfit = lpRevenue - totalOutOfPocket; // Real profit after COGS + excise
    const trueMarginPct = lpRevenue > 0 ? netProfit / lpRevenue : 0;
    const exciseAsPercentOfLP = lpRevenue > 0 ? excise / lpRevenue : 0;
    const roiPct = totalOutOfPocket > 0 ? netProfit / totalOutOfPocket : 0; // Return on investment

    results.push({
      province: r.province,
      provinceKey: provKey,
      cogs,
      lpRevenue,
      excise,
      totalOutOfPocket,
      landedAtDistributor,
      netProfit,
      trueMarginPct,
      exciseAsPercentOfLP,
      roiPct,
      wholesalePrice: r.wholesalePrice + r.mbSRFAmount,
      consumerPrice: r.consumerPrice
    });
  }

  // Sort by net profit descending (best provinces first)
  return results.sort((a, b) => b.netProfit - a.netProfit);
}

// ============================================================
// UI Controller
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const productSelect = document.getElementById("productType");
  const provinceSelect = document.getElementById("province");
  const quantityInput = document.getElementById("quantity");
  const thcInput = document.getElementById("thcMg");
  const lpCostInput = document.getElementById("lpCost");
  const retailSlider = document.getElementById("retailMarkup");
  const retailValueLabel = document.getElementById("retailMarkupValue");
  const thcGroup = document.getElementById("thcGroup");
  const quantityLabel = document.getElementById("quantityLabel");
  const calculateBtn = document.getElementById("calculateBtn");
  const resultsPanel = document.getElementById("resultsPanel");

  // Populate product types
  Object.entries(PRODUCT_TYPES).forEach(([key, pt]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${pt.icon}  ${pt.label}`;
    productSelect.appendChild(opt);
  });

  // Populate provinces
  Object.entries(PROVINCES).forEach(([key, prov]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${prov.flag}  ${prov.name}`;
    provinceSelect.appendChild(opt);
  });

  // Toggle fields
  function updateFields() {
    const pt = PRODUCT_TYPES[productSelect.value];
    if (!pt) return;
    thcGroup.style.display = pt.needsTHC ? "flex" : "none";
    quantityLabel.textContent = `Quantity (${pt.unitLabel})`;
  }

  productSelect.addEventListener("change", updateFields);
  updateFields();

  // Retail markup slider
  retailSlider.addEventListener("input", () => {
    retailValueLabel.textContent = retailSlider.value + "%";
  });

  // DOM Elements for Matrix & Margin
  const matrixPanel = document.getElementById("matrixPanel");
  const matrixTableBody = document.querySelector("#matrixTable tbody");
  const reverseBtn = document.getElementById("reverseBtn");
  const matrixBtn = document.getElementById("matrixBtn");
  const marginBtn = document.getElementById("marginBtn");
  const marginPanel = document.getElementById("marginPanel");

  // Helper to extract inputs
  function getInputs() {
    return {
      productKey: productSelect.value,
      provinceKey: provinceSelect.value,
      qty: parseFloat(quantityInput.value) || 0,
      thc: parseFloat(thcInput.value) || 0,
      lp: parseFloat(lpCostInput.value) || 0,
      retMk: parseFloat(retailSlider.value) / 100
    };
  }

  function validateBasic(i) {
    if (!i.productKey || !i.provinceKey) { showError("Select a product type and province."); return false; }
    if (i.qty <= 0) { showError("Enter a valid quantity."); return false; }
    return true;
  }

  // 1. Calculate Forward
  calculateBtn.addEventListener("click", () => {
    const i = getInputs();
    if (!validateBasic(i)) return;
    if (i.lp <= 0) { showError("Enter your LP production cost."); return; }

    matrixPanel.style.display = "none"; // Hide matrix if open
    marginPanel.style.display = "none"; // Hide margin if open

    const r = calculate(i.productKey, i.provinceKey, i.qty, i.thc, i.lp, i.retMk);
    if (!r) return;
    renderResults(r, i.productKey, i.provinceKey);
  });

  // 2. Reverse Solver
  reverseBtn.addEventListener("click", () => {
    const i = getInputs();
    if (!validateBasic(i)) return;
    if (i.lp <= 0) { showError("Enter your TARGET Retail Shelf Price in the LP Cost field."); return; }

    matrixPanel.style.display = "none";
    marginPanel.style.display = "none";

    const targetRetail = i.lp;
    const requiredLPCost = solveForSellingPrice(targetRetail, i.productKey, i.provinceKey, i.qty, i.thc, i.retMk);

    if (requiredLPCost === 0) {
      showError("Could not find a valid LP cost for that target price.");
      return;
    }

    // Temporarily replace LP cost input with solved value for render
    lpCostInput.value = requiredLPCost.toFixed(2);
    const r = calculate(i.productKey, i.provinceKey, i.qty, i.thc, requiredLPCost, i.retMk);

    // Add solver notification to results
    r.solverMessage = `✅ Solver found match: To hit a **$${targetRetail.toFixed(2)}** shelf price, your LP Cost must be exactly **$${requiredLPCost.toFixed(2)}**.`;

    renderResults(r, i.productKey, i.provinceKey);
  });

  // 3. Multi-Province Matrix
  matrixBtn.addEventListener("click", () => {
    const i = getInputs();
    if (!validateBasic(i)) return;
    if (i.lp <= 0) { showError("Enter your LP production cost to compare."); return; }

    resultsPanel.classList.remove("visible"); // Hide pipeline
    marginPanel.style.display = "none";

    const matrixResults = calculateAllProvinces(i.productKey, i.qty, i.thc, i.lp, i.retMk);
    renderMatrix(matrixResults);
  });

  // 4. Cost & Margin Analysis
  marginBtn.addEventListener("click", () => {
    const i = getInputs();
    if (!validateBasic(i)) return;
    if (i.lp <= 0) { showError("Enter your LP production cost to run margin analysis."); return; }

    resultsPanel.classList.remove("visible"); // Hide pipeline
    matrixPanel.style.display = "none";

    const marginResults = calculateMarginAnalysis(i.productKey, i.qty, i.thc, i.lp, i.retMk);
    renderMarginAnalysis(marginResults, i.lp, PRODUCT_TYPES[i.productKey]);
  });

  function showError(msg) {
    resultsPanel.innerHTML = `<div class="error-message">${msg}</div>`;
    resultsPanel.classList.add("visible");
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fmt(n) { return "$" + n.toFixed(2); }
  function pct(n) { return (n * 100).toFixed(1) + "%"; }

  // ── Render ──
  function renderResults(r, productKey, provinceKey) {
    const product = PRODUCT_TYPES[productKey];
    const province = PROVINCES[provinceKey];

    let html = `
      <div class="results-header">
        <h2>Pricing Pipeline</h2>
        <div class="results-subtitle">${product.icon} ${r.productType} → ${province.flag} ${r.province}</div>
      </div>
    `;

    if (r.solverMessage) {
      html += `
        <div class="price-floor-warning" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); color: var(--accent-emerald);">
          ${r.solverMessage}
        </div>
      `;
    }

    // Price floor warning
    if (r.priceFloorWarning) {
      html += `<div class="price-floor-warning">⚠️ ${r.priceFloorWarning}</div>`;
    }

    // ── Pipeline visualization ──
    html += `<div class="pipeline">`;

    // Step 1: LP Cost
    html += pipelineStep("1", "LP Production Cost", fmt(r.lpCost),
      "Your cost to produce", "lp", null);

    html += pipelineArrow("+");

    // Step 2: Excise Duty
    let exciseDetails = "";
    if (product.method === "higher_of") {
      exciseDetails += `<div class="pipe-detail">Federal: ${fmt(r.federalDuty)} <span class="pipe-tag">${r.federalMethod}</span></div>`;
      exciseDetails += `<div class="pipe-sub">Flat: ${fmt(product.federalFlat)}/${product.unitLabel} × ${r.quantity} = ${fmt(r.federalFlatDuty)}</div>`;
      exciseDetails += `<div class="pipe-sub">Ad Val: ${pct(product.federalAdValorem)} × ${fmt(r.lpCost)} = ${fmt(r.federalAdValoremDuty)}</div>`;
    } else {
      exciseDetails += `<div class="pipe-detail">Federal: ${fmt(r.federalDuty)} <span class="pipe-tag">${r.federalMethod}</span></div>`;
      exciseDetails += `<div class="pipe-sub">$0.0025/mg × ${r.thcMg} mg</div>`;
    }

    if (province.coordinated) {
      exciseDetails += `<div class="pipe-detail">Provincial: ${fmt(r.totalProvincialDuty)} <span class="pipe-tag">${r.provincialMethod}</span></div>`;
      if (product.method === "higher_of") {
        exciseDetails += `<div class="pipe-sub">Flat: ${fmt(product.provincialFlat)}/${product.unitLabel} × ${r.quantity} = ${fmt(r.provincialFlatDuty)}</div>`;
        exciseDetails += `<div class="pipe-sub">Ad Val: ${pct(product.provincialAdValorem)} × ${fmt(r.lpCost)} = ${fmt(r.provincialAdValoremDuty)}</div>`;
      } else {
        exciseDetails += `<div class="pipe-sub">$0.0075/mg × ${r.thcMg} mg = ${fmt(r.provincialBaseDuty)}</div>`;
      }
      if (r.adjustmentRate > 0) {
        exciseDetails += `<div class="pipe-sub adjust">Adjustment (${pct(r.adjustmentRate)}): +${fmt(r.adjustmentAmount)}</div>`;
      }
    } else {
      exciseDetails += `<div class="pipe-detail">Provincial: ${fmt(0)} <span class="pipe-tag">Non-coordinated</span></div>`;
    }

    html += pipelineStep("2", "CRA Excise Duty", fmt(r.totalExciseDuty), exciseDetails, "excise", null);

    html += pipelineArrow("=");

    // Step 3: Landed Cost
    html += pipelineStep("3", "Landed Cost", fmt(r.landedCost),
      `LP Cost (${fmt(r.lpCost)}) + Excise (${fmt(r.totalExciseDuty)})`, "landed", null);

    html += pipelineArrow("×");

    // Step 4: Wholesale
    let wholesaleDetails = `<div class="pipe-detail">${r.wholesaleMarkupLabel}: +${fmt(r.wholesaleMarkupAmount)}</div>`;
    if (r.mbSRFAmount > 0) {
      wholesaleDetails += `<div class="pipe-detail">${province.mbSRFLabel}: +${fmt(r.mbSRFAmount)}</div>`;
    }
    html += pipelineStep("4", "Wholesale Price", fmt(r.wholesalePrice + r.mbSRFAmount),
      wholesaleDetails, "wholesale", null);

    html += pipelineArrow("×");

    // Step 5: Retail (pre-tax)
    html += pipelineStep("5", "Pre-Tax Retail Price", fmt(r.preTaxRetailPrice),
      `${r.retailMarkupPct > 0 ? pct(r.retailMarkupPct) + " retail markup" : "No retail markup"}`, "retail", null);

    html += pipelineArrow("+");

    // Step 6: Sales Tax
    html += pipelineStep("6", "Sales Tax", fmt(r.salesTaxAmount),
      `${r.salesTaxLabel}`, "tax", null);

    html += pipelineArrow("=");

    // Final: Consumer Price
    html += `
      <div class="pipeline-step final">
        <div class="step-number">🍁</div>
        <div class="step-content">
          <div class="step-label">Consumer Shelf Price</div>
          <div class="step-value final-price">${fmt(r.consumerPrice)}</div>
          <div class="step-details">Rounded to nearest $0.05</div>
        </div>
      </div>
    `;

    html += `</div>`; // close pipeline

    // ── Summary Cards ──
    const cogs = r.lpCost * 0.50;
    const totalOOP = cogs + r.totalExciseDuty;
    const netProfit = r.lpCost - totalOOP;
    const trueMargin = r.lpCost > 0 ? netProfit / r.lpCost : 0;

    html += `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="sc-label">Excise Per ${product.unitLabel === "g" ? "Gram" : "Unit"}</div>
          <div class="sc-value">${fmt(r.excisePerUnit)}</div>
        </div>
        <div class="summary-card">
          <div class="sc-label">Total Gov. Take Per ${product.unitLabel === "g" ? "Gram" : "Unit"}</div>
          <div class="sc-value">${fmt(r.totalTaxPerUnit)}</div>
        </div>
        <div class="summary-card accent">
          <div class="sc-label">Effective Tax Rate</div>
          <div class="sc-value">${r.effectiveTaxRate > 0 ? pct(r.effectiveTaxRate) : "N/A"}</div>
        </div>
        <div class="summary-card">
          <div class="sc-label">LP Gets</div>
          <div class="sc-value">${fmt(r.lpCost)}</div>
          <div class="sc-sub">${r.consumerPrice > 0 ? pct(r.lpCost / r.consumerPrice) + " of shelf price" : ""}</div>
        </div>
      </div>
    `;

    // ── LP Margin Cards ──
    html += `
      <div class="margin-summary">
        <h3>💰 Your Margin Breakdown <span class="margin-assumption">(assuming 50% COGS)</span></h3>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="sc-label">COGS (50%)</div>
            <div class="sc-value">${fmt(cogs)}</div>
            <div class="sc-sub">Production cost</div>
          </div>
          <div class="summary-card">
            <div class="sc-label">Out-of-Pocket</div>
            <div class="sc-value">${fmt(totalOOP)}</div>
            <div class="sc-sub">COGS + Excise upfront</div>
          </div>
          <div class="summary-card ${netProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
            <div class="sc-label">Net Profit</div>
            <div class="sc-value">${fmt(netProfit)}</div>
            <div class="sc-sub">Revenue − Out-of-Pocket</div>
          </div>
          <div class="summary-card ${trueMargin >= 0.20 ? 'profit-positive' : trueMargin >= 0 ? 'profit-warning' : 'profit-negative'}">
            <div class="sc-label">True Margin</div>
            <div class="sc-value">${pct(trueMargin)}</div>
            <div class="sc-sub">After excise impact</div>
          </div>
        </div>
      </div>
    `;

    resultsPanel.innerHTML = html;
    resultsPanel.classList.add("visible");
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function pipelineStep(num, label, value, details, type) {
    return `
      <div class="pipeline-step ${type}">
        <div class="step-number">${num}</div>
        <div class="step-content">
          <div class="step-label">${label}</div>
          <div class="step-value">${value}</div>
          <div class="step-details">${details}</div>
        </div>
      </div>
    `;
  }

  function pipelineArrow(symbol) {
    return `<div class="pipeline-arrow"><span>${symbol}</span></div>`;
  }

  // ── Render Matrix ──
  function renderMatrix(results) {
    matrixTableBody.innerHTML = "";

    results.forEach(r => {
      const tr = document.createElement("tr");

      const provName = PROVINCES[Object.keys(PROVINCES).find(k => PROVINCES[k].name === r.province)].flag + " " + r.province;

      tr.innerHTML = `
        <td>${provName}</td>
        <td>${fmt(r.totalExciseDuty)}</td>
        <td>${fmt(r.landedCost)}</td>
        <td>${fmt(r.wholesalePrice + r.mbSRFAmount)}</td>
        <td>${fmt(r.salesTaxAmount)}</td>
        <td class="val-highlight">${fmt(r.consumerPrice)}</td>
        <td>${r.effectiveTaxRate > 0 ? pct(r.effectiveTaxRate) : "N/A"}</td>
      `;
      matrixTableBody.appendChild(tr);
    });

    matrixPanel.style.display = "block";
    matrixPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Render Margin Analysis ──
  function renderMarginAnalysis(results, lpCost, product) {
    const cogs = lpCost * 0.50;

    // Find best/worst for highlighting
    const bestProfit = Math.max(...results.map(r => r.netProfit));
    const worstProfit = Math.min(...results.map(r => r.netProfit));

    let html = `
      <h2>💰 Cost & Margin Analysis</h2>
      <p class="margin-intro">
        Real profitability across all provinces. COGS assumed at <strong>50%</strong> of LP Cost
        (<strong>${fmt(cogs)}</strong>). Excise is paid <strong>upfront</strong> before product reaches distributor.
      </p>

      <div class="margin-kpi-strip">
        <div class="kpi">
          <span class="kpi-label">LP Revenue</span>
          <span class="kpi-value">${fmt(lpCost)}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">COGS (50%)</span>
          <span class="kpi-value">${fmt(cogs)}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Pre-Excise Margin</span>
          <span class="kpi-value kpi-good">50.0%</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Best Province Margin</span>
          <span class="kpi-value ${bestProfit >= 0 ? 'kpi-good' : 'kpi-bad'}">${pct(results[0].trueMarginPct)}</span>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table margin-table">
          <thead>
            <tr>
              <th>Province</th>
              <th>Excise Duty</th>
              <th>Total Out-of-Pocket</th>
              <th>Landed @ Distributor</th>
              <th>Net Profit</th>
              <th>True Margin</th>
              <th>Excise % of Revenue</th>
              <th>Shelf Price</th>
            </tr>
          </thead>
          <tbody>
    `;

    results.forEach(r => {
      const prov = PROVINCES[r.provinceKey];
      const profitClass = r.netProfit >= cogs * 0.4 ? 'profit-good' : r.netProfit >= 0 ? 'profit-ok' : 'profit-bad';
      const marginClass = r.trueMarginPct >= 0.20 ? 'margin-good' : r.trueMarginPct >= 0 ? 'margin-ok' : 'margin-bad';
      const isBest = r.netProfit === bestProfit ? ' row-best' : '';
      const isWorst = r.netProfit === worstProfit ? ' row-worst' : '';

      html += `
        <tr class="${isBest}${isWorst}">
          <td>${prov.flag} ${r.province}</td>
          <td>${fmt(r.excise)}</td>
          <td>${fmt(r.totalOutOfPocket)}</td>
          <td>${fmt(r.landedAtDistributor)}</td>
          <td class="${profitClass}">${fmt(r.netProfit)}</td>
          <td class="${marginClass}">${pct(r.trueMarginPct)}</td>
          <td>${pct(r.exciseAsPercentOfLP)}</td>
          <td class="val-highlight">${fmt(r.consumerPrice)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>

      <div class="margin-footnote">
        <p>📊 Sorted by net profit (highest first). Out-of-pocket = COGS + Excise (paid upfront before distributor payment).</p>
        <p>True Margin = (LP Revenue − Out-of-Pocket) ÷ LP Revenue. Pre-excise margin is 50% by assumption.</p>
      </div>
    `;

    marginPanel.innerHTML = html;
    marginPanel.style.display = "block";
    marginPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
