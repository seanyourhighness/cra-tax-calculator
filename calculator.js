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
    wholesaleMarkup: null,
    wholesaleMarkupLabel: "OCS Wholesale Markup",
    paymentTermDays: 30, distributor: "OCS"
  },
  AB: {
    name: "Alberta", flag: "🏔️",
    adjustmentRate: 0.168, coordinated: true,
    salesTaxRate: 0.05, salesTaxLabel: "GST (5%)",
    wholesaleMarkup: 0.06,
    wholesaleMarkupLabel: "AGLC 6% Ad Valorem Markup",
    paymentTermDays: 15, distributor: "AGLC"
  },
  BC: {
    name: "British Columbia", flag: "🌲",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.12, salesTaxLabel: "GST + PST (5% + 7%)",
    // BC charges 20% PST on vaping products (devices, cartridges, cannabis e-juice)
    vapeSalesTaxRate: 0.25, vapeSalesTaxLabel: "GST + PST (5% + 20%)",
    wholesaleMarkup: 0.15,
    wholesaleMarkupLabel: "BCLDB 15% Wholesale Markup",
    paymentTermDays: 30, distributor: "BCLDB"
  },
  QC: {
    name: "Quebec", flag: "⚜️",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.14975, salesTaxLabel: "GST + QST (5% + 9.975%)",
    wholesaleMarkup: 0.20,
    wholesaleMarkupLabel: "SQDC Markup (~20%)",
    paymentTermDays: 45, distributor: "SQDC"
  },
  SK: {
    name: "Saskatchewan", flag: "🌾",
    adjustmentRate: 0.0645, coordinated: true,
    salesTaxRate: 0.11, salesTaxLabel: "GST + PST (5% + 6%)",
    wholesaleMarkup: 0.0,
    wholesaleMarkupLabel: "Direct-to-Retail (0% Wholesale)",
    paymentTermDays: 30, distributor: "SLGA"
  },
  MB: {
    name: "Manitoba", flag: "🦬",
    adjustmentRate: 0, coordinated: false,
    salesTaxRate: 0.12, salesTaxLabel: "GST + RST (5% + 7%)",
    wholesaleMarkup: 0.09,
    wholesaleMarkupLabel: "MBLL 9% Markup",
    mbSocialResp: 0.06,
    mbSRFLabel: "6% Social Responsibility Fee",
    paymentTermDays: 30, distributor: "MBLL"
  },
  NB: {
    name: "New Brunswick", flag: "⚓",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.15, salesTaxLabel: "HST (15%)",
    wholesaleMarkup: 0.20,
    wholesaleMarkupLabel: "Cannabis NB Markup (~20%)",
    paymentTermDays: 30, distributor: "Cannabis NB"
  },
  NL: {
    name: "Newfoundland & Labrador", flag: "🐟",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.15, salesTaxLabel: "HST (15%)",
    wholesaleMarkup: 0.0225,
    wholesaleMarkupLabel: "NLC 2.25% Consignment Fee",
    paymentTermDays: 30, distributor: "NLC"
  },
  NS: {
    name: "Nova Scotia", flag: "⚓",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.14, salesTaxLabel: "HST (14%)",
    wholesaleMarkup: 0.20,
    wholesaleMarkupLabel: "NSLC Markup (~20%)",
    paymentTermDays: 30, distributor: "NSLC"
  },
  PE: {
    name: "Prince Edward Island", flag: "🥔",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.15, salesTaxLabel: "HST (15%)",
    wholesaleMarkup: 0.20,
    wholesaleMarkupLabel: "PEI Cannabis Markup (~20%)",
    paymentTermDays: 30, distributor: "PEI Cannabis"
  },
  NT: {
    name: "Northwest Territories", flag: "❄️",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.05, salesTaxLabel: "GST (5%)",
    wholesaleMarkup: 0.34,
    wholesaleMarkupLabel: "NTLL 34% Standard Markup",
    paymentTermDays: 30, distributor: "NTLL"
  },
  NU: {
    name: "Nunavut", flag: "🏔️",
    adjustmentRate: 0.193, coordinated: true,
    salesTaxRate: 0.05, salesTaxLabel: "GST (5%)",
    wholesaleMarkup: 0,
    wholesaleMarkupLabel: "NULC ($1/g Flat Retail Markup)",
    nuFlatRetail: 1.00,
    paymentTermDays: 30, distributor: "NULC"
  },
  YT: {
    name: "Yukon", flag: "🐻",
    adjustmentRate: 0, coordinated: true,
    salesTaxRate: 0.05, salesTaxLabel: "GST (5%)",
    wholesaleMarkup: 0.235,
    wholesaleMarkupLabel: "YLC 20% Markup + 3.5% Logistics",
    paymentTermDays: 30, distributor: "YLC"
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

  // CRA Dutiable Amount formula (Excise Act 2001):
  //   Dutiable Amount = A × [100% / (100% + B + C)]
  //   A = LP selling price (total consideration)
  //   B = federal ad valorem rate (2.5%)
  //   C = provincial ad valorem rate (7.5%, or 0% for Manitoba)
  // This isolates the tax-exclusive base from the tax-inclusive selling price.
  const fedAdVal = product.method === "higher_of" ? product.federalAdValorem : 0;
  const provAdVal = (product.method === "higher_of" && province.coordinated) ? product.provincialAdValorem : 0;
  const dutiableAmount = lpCost * (1 / (1 + fedAdVal + provAdVal));

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

      // CRA adjustment rate: applied to a "base amount" or "dutiable amount" depending
      // on which method won. Per Excise Act 2001 s.158.22:
      //   If FLAT wins: base amount = [(A − fedFlat − provFlat)] × [100%/(100%+D)]
      //   If AD VAL wins: adjustment = adjustmentRate × dutiableAmount
      if (r.provincialAdValoremDuty > r.provincialFlatDuty) {
        // Ad valorem won — adjustment on dutiable amount
        r.adjustmentAmount = province.adjustmentRate * dutiableAmount;
        r.provincialBaseDuty = r.provincialAdValoremDuty;
        r.totalProvincialDuty = r.provincialAdValoremDuty + r.adjustmentAmount;
        r.provincialMethod = "Ad Valorem + Adj. (higher)";
      } else {
        // Flat rate won — adjustment on base amount
        // Base Amount = (A − fedFlatTotal − provFlatTotal) / (1 + D)
        const fedFlatTotal = product.federalFlat * quantity;
        const provFlatTotal = product.provincialFlat * quantity;
        const baseAmount = (lpCost - fedFlatTotal - provFlatTotal) / (1 + province.adjustmentRate);
        r.adjustmentAmount = province.adjustmentRate * Math.max(0, baseAmount);
        r.provincialBaseDuty = r.provincialFlatDuty;
        r.totalProvincialDuty = r.provincialFlatDuty + r.adjustmentAmount;
        r.provincialMethod = "Flat Rate + Adj. (higher)";
      }
    } else {
      // THC-based products: flat rate only, no ad valorem
      r.provincialBaseDuty = product.provincialPerMgTHC * thcMg;
      // For THC products, the CRA adjustment base amount is derived from the
      // selling price minus the federal and provincial THC duties:
      //   Base Amount = (A − fedTHCduty − provTHCduty) / (1 + D)
      const fedTHCduty = product.federalPerMgTHC * thcMg;
      const provTHCduty = product.provincialPerMgTHC * thcMg;
      const thcBaseAmount = (lpCost - fedTHCduty - provTHCduty) / (1 + province.adjustmentRate);
      r.adjustmentAmount = province.adjustmentRate * Math.max(0, thcBaseAmount);
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
  // BC charges 20% PST (25% combined) on vape products specifically
  const isVapeProduct = (productTypeKey === 'vapes');
  if (isVapeProduct && province.vapeSalesTaxRate) {
    r.salesTaxRate = province.vapeSalesTaxRate;
    r.salesTaxLabel = province.vapeSalesTaxLabel;
  }
  r.salesTaxAmount = r.preTaxRetailPrice * r.salesTaxRate;
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
// Helper: calculate across all provinces (used by Scenario Simulator)
// ============================================================

function calculateAllProvinces(productTypeKey, quantity, thcMg, lpCost, retailMarkupPct) {
  const results = [];
  for (const provKey of Object.keys(PROVINCES)) {
    const r = calculate(productTypeKey, provKey, quantity, thcMg, lpCost, retailMarkupPct);
    if (r) results.push(r);
  }
  return results.sort((a, b) => a.consumerPrice - b.consumerPrice);
}

// ============================================================
// Margin Protection Engine
// ============================================================

/**
 * Margin Protection: find the minimum LP cost per province to guarantee
 * a target margin (e.g. 40%) after COGS and excise.
 *
 * margin = (lpCost - cogs - excise) / lpCost >= targetMargin
 *
 * For each province, binary-searches for the minimum LP where the margin equation holds.
 * baseLPCost is the user's intended LP price — the recommended LP is the higher of
 * the base and the minimum needed for margin protection.
 */
function calculateMarginProtection(baseLPCost, targetMargin, productTypeKey, quantity, thcMg, retailMarkupPct, cogsOverride = null) {
  const results = [];

  for (const provKey of Object.keys(PROVINCES)) {
    const province = PROVINCES[provKey];

    // Step 1: Find the minimum LP cost to achieve target margin in this province
    // margin = (lp - cogs - excise(lp)) / lp >= targetMargin
    // Since excise depends on LP (for ad valorem), we binary search
    let minLP = 0;
    const cogs = cogsOverride !== null ? cogsOverride : baseLPCost * 0.50;

    // Binary search: find minimum LP where margin >= targetMargin
    let lo = Math.max(0.01, cogs); // LP must be at least COGS
    let hi = cogs * 10; // generous upper bound
    let bestMinLP = hi;
    const maxIter = 100;
    const tolerance = 0.001;

    for (let iter = 0; iter < maxIter; iter++) {
      const mid = (lo + hi) / 2;
      const sim = calculate(productTypeKey, provKey, quantity, thcMg, mid, retailMarkupPct);
      if (!sim) break;

      const excise = sim.totalExciseDuty;
      const cogsForCalc = cogsOverride !== null ? cogsOverride : mid * 0.50;
      const margin = mid > 0 ? (mid - cogsForCalc - excise) / mid : 0;

      if (margin >= targetMargin - 0.001) {
        bestMinLP = mid;
        hi = mid - tolerance;
      } else {
        lo = mid + tolerance;
      }
    }
    minLP = bestMinLP;

    // Step 2: Recommended LP = max(user's base LP, minimum for margin)
    const recommendedLP = Math.max(baseLPCost, minLP);
    const lpAdjustment = recommendedLP - baseLPCost;

    // Step 3: Calculate full pipeline at recommended LP
    const calc = calculate(productTypeKey, provKey, quantity, thcMg, recommendedLP, retailMarkupPct);
    if (!calc) continue;

    const excise = calc.totalExciseDuty;
    const actualCogs = cogsOverride !== null ? cogsOverride : recommendedLP * 0.50;
    const netProfit = recommendedLP - actualCogs - excise;
    const actualMargin = recommendedLP > 0 ? netProfit / recommendedLP : 0;
    const cashOutlay = actualCogs + excise; // upfront cash needed
    const excisePctOfLP = recommendedLP > 0 ? excise / recommendedLP : 0;
    const cashOutlayPct = recommendedLP > 0 ? cashOutlay / recommendedLP : 0;
    const marginBuffer = actualMargin - targetMargin; // headroom above minimum

    // Step 4: Determine status
    let marginStatus, statusIcon;
    if (actualMargin >= targetMargin - 0.005) {
      marginStatus = "protected";
      statusIcon = "🛡️";
    } else if (actualMargin >= targetMargin * 0.75) {
      marginStatus = "at-risk";
      statusIcon = "⚠️";
    } else {
      marginStatus = "below-floor";
      statusIcon = "🚨";
    }

    // If user's base LP is above minimum, they're protected; if below, they need to raise
    const needsLPIncrease = baseLPCost < minLP;

    // Step 5: Best-practice alerts
    const alerts = [];
    if (excisePctOfLP > 0.30) {
      alerts.push({ type: "tax", icon: "🚨", text: `Excise is ${(excisePctOfLP * 100).toFixed(0)}% of LP — reserve 40-50% of gross for taxes` });
    }
    if (cashOutlayPct > 0.60) {
      alerts.push({ type: "cash", icon: "💸", text: `Cash outlay is ${(cashOutlayPct * 100).toFixed(0)}% of LP revenue — maintain 6-9 month runway` });
    }
    if (actualMargin < 0.25 && actualMargin >= 0) {
      alerts.push({ type: "margin", icon: "📉", text: `Post-excise margin is thin — consider raising LP or reducing COGS` });
    }

    results.push({
      province: province.name,
      provinceKey: provKey,
      baseLPCost,
      minLPforMargin: minLP,
      recommendedLP,
      lpAdjustment,
      needsLPIncrease,
      cogs: actualCogs,
      excise,
      excisePctOfLP,
      landed: calc.landedCost,
      wholesale: calc.wholesalePrice + calc.mbSRFAmount,
      consumerPrice: calc.consumerPrice,
      shelfPrice: calc.preTaxRetailPrice,
      cashOutlay,
      cashOutlayPct,
      netProfit,
      actualMargin,
      marginBuffer,
      marginStatus,
      statusIcon,
      alerts,
      salesTaxLabel: calc.salesTaxLabel
    });
  }

  // Sort by margin (worst provinces first — so you see risks at top)
  return results.sort((a, b) => a.actualMargin - b.actualMargin);
}

/**
 * Market baseline data for future competitor analysis.
 * Will be populated from OCS/BCLDB/AGLC scraping or manual updates.
 */
const MARKET_BASELINES = {
  dried_flower: { low: 4.00, mid: 6.50, high: 9.00, source: "Industry avg (2025)" },
  trim: { low: 1.50, mid: 3.00, high: 5.00, source: "Industry avg (2025)" },
  prerolls: { low: 5.00, mid: 7.50, high: 11.00, source: "Industry avg (2025)" },
  infused_prerolls: { low: 7.00, mid: 10.00, high: 15.00, source: "Industry avg (2025)" },
  vapes: { low: 15.00, mid: 22.00, high: 30.00, source: "Industry avg (2025)" },
  edibles: { low: 3.50, mid: 5.50, high: 8.00, source: "Industry avg (2025)" },
  extracts: { low: 20.00, mid: 30.00, high: 45.00, source: "Industry avg (2025)" },
  oils: { low: 20.00, mid: 35.00, high: 55.00, source: "Industry avg (2025)" },
  topicals: { low: 10.00, mid: 18.00, high: 28.00, source: "Industry avg (2025)" },
  beverages: { low: 3.50, mid: 5.50, high: 8.00, source: "Industry avg (2025)" },
  capsules: { low: 8.00, mid: 15.00, high: 25.00, source: "Industry avg (2025)" },
  plants: { low: 15.00, mid: 25.00, high: 40.00, source: "Industry avg (2025)" },
  seeds: { low: 3.00, mid: 5.00, high: 8.00, source: "Industry avg (2025)" }
};

/**
 * Persistent competitor prices — survives slider re-renders.
 * Each entry: { brand: string, price: number }
 */
let savedCompetitorPrices = [];

// ============================================================
// UI Controller
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const productSelect = document.getElementById("productType");
  const provinceSelect = document.getElementById("province");
  const quantityInput = document.getElementById("quantity");
  const thcInput = document.getElementById("thcMg");
  const lpCostInput = document.getElementById("lpCost");
  const trueCogsInput = document.getElementById("trueCogs");
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

  const balancedBtn = document.getElementById("balancedBtn");
  const balancedPanel = document.getElementById("balancedPanel");
  const scenarioBtn = document.getElementById("scenarioBtn");
  const scenarioPanel = document.getElementById("scenarioPanel");
  const exportPdfBtn = document.getElementById("exportPdfBtn");

  // Helper to hide all extra panels
  function hideAllPanels() {
    balancedPanel.style.display = "none";
    scenarioPanel.style.display = "none";
    exportPdfBtn.style.display = "none";
  }

  // Show the floating export button
  function showExportBtn() {
    exportPdfBtn.style.display = "flex";
  }

  // PDF Export
  exportPdfBtn.addEventListener("click", () => {
    // Detect the active panel
    let source = null;
    let featureName = "Report";
    if (resultsPanel.classList.contains("visible")) {
      source = resultsPanel;
      featureName = "Pipeline";
    } else if (balancedPanel.style.display !== "none") {
      source = balancedPanel;
      featureName = "Margin_Protection";
    } else if (scenarioPanel.style.display !== "none") {
      source = scenarioPanel;
      featureName = "Scenario";
    }
    if (!source) return;

    // Build branded PDF wrapper
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "padding:24px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;background:#fff;";

    // Header
    const i = getInputs();
    const productLabel = PRODUCT_TYPES[i.productKey]?.label || "";
    const provLabel = PROVINCES[i.provinceKey]?.name || "All Provinces";
    const dateStr = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

    wrapper.innerHTML = `
      <div style="border-bottom:3px solid #6366f1;padding-bottom:12px;margin-bottom:16px;">
        <h1 style="margin:0;font-size:20px;color:#6366f1;">Cannabis Pricing Calculator — ${featureName.replace(/_/g, ' ')}</h1>
        <p style="margin:4px 0 0;font-size:12px;color:#64748b;">
          ${productLabel ? productLabel + ' • ' : ''}${provLabel} • ${i.qty}${PRODUCT_TYPES[i.productKey]?.unitLabel || 'g'}
          • LP: $${i.lp.toFixed(2)} • Retail Markup: ${(i.retMk * 100).toFixed(0)}% • ${dateStr}
        </p>
      </div>
    `;

    // Clone content
    const clone = source.cloneNode(true);
    clone.style.display = "block";
    clone.style.cssText = "color:#1e293b;";
    // Fix table text colors for print
    clone.querySelectorAll("td, th").forEach(el => {
      el.style.color = "#1e293b";
      el.style.borderColor = "#e2e8f0";
    });
    clone.querySelectorAll("h2").forEach(el => el.style.color = "#334155");
    clone.querySelectorAll(".margin-good, .profit-good, .kpi-good").forEach(el => el.style.color = "#059669");
    clone.querySelectorAll(".margin-bad").forEach(el => el.style.color = "#dc2626");
    clone.querySelectorAll(".margin-ok").forEach(el => el.style.color = "#d97706");
    clone.querySelectorAll(".val-highlight").forEach(el => el.style.color = "#6366f1");
    wrapper.appendChild(clone);

    // Footer
    const footer = document.createElement("div");
    footer.style.cssText = "margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;";
    footer.textContent = "Generated by Cannabis Pricing Calculator • CRA Excise + OCS Retail Pipeline • For estimation purposes only";
    wrapper.appendChild(footer);

    const filename = `Cannabis_${featureName}_${new Date().toISOString().slice(0, 10)}.pdf`;

    html2pdf().set({
      margin: [10, 10, 10, 10],
      filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
    }).from(wrapper).save();
  });

  // Helper to extract inputs
  function getInputs() {
    const cogsRaw = trueCogsInput.value.trim();
    return {
      productKey: productSelect.value,
      provinceKey: provinceSelect.value,
      qty: parseFloat(quantityInput.value) || 0,
      thc: parseFloat(thcInput.value) || 0,
      lp: parseFloat(lpCostInput.value) || 0,
      retMk: parseFloat(retailSlider.value) / 100,
      cogsOverride: cogsRaw !== '' ? parseFloat(cogsRaw) : null
    };
  }

  // COGS helpers
  function getCogsValue(lp, cogsOverride) {
    return cogsOverride !== null ? cogsOverride : lp * 0.50;
  }
  function cogsLabel(cogsOverride) {
    return cogsOverride !== null ? 'COGS (actual)' : 'COGS (est. 50%)';
  }
  function cogsBadge(cogsOverride) {
    return cogsOverride !== null
      ? '<span class="cogs-indicator cogs-actual">Actual</span>'
      : '<span class="cogs-indicator cogs-estimated">Est.</span>';
  }
  function cogsAssumptionText(cogsOverride) {
    return cogsOverride !== null ? 'actual COGS' : 'assuming 50% COGS';
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

    hideAllPanels();

    const r = calculate(i.productKey, i.provinceKey, i.qty, i.thc, i.lp, i.retMk);
    if (!r) return;
    renderResults(r, i.productKey, i.provinceKey);
  });

  // 2. Margin Protection
  let lastProtectionInputs = null;
  let lastProtectionMargin = 0.40; // default 40% target
  balancedBtn.addEventListener("click", () => {
    const i = getInputs();
    if (!validateBasic(i)) return;
    if (i.lp <= 0) { showError("Enter your base LP production cost."); return; }

    resultsPanel.classList.remove("visible");
    hideAllPanels();

    lastProtectionInputs = i;

    const results = calculateMarginProtection(i.lp, lastProtectionMargin, i.productKey, i.qty, i.thc, i.retMk, i.cogsOverride);
    renderMarginProtection(results, lastProtectionMargin, i.lp, PRODUCT_TYPES[i.productKey], i.productKey, i.retMk, i.cogsOverride);
  });

  // 6. Scenario Simulator
  scenarioBtn.addEventListener("click", () => {
    const i = getInputs();
    if (!validateBasic(i)) return;
    if (i.lp <= 0) { showError("Enter your LP production cost."); return; }

    resultsPanel.classList.remove("visible");
    hideAllPanels();

    renderScenarioSimulator(i);
  });

  function runScenarioComparison(paramsA, paramsB) {
    const resultsA = calculateAllProvinces(paramsA.productKey, paramsA.qty, paramsA.thc, paramsA.lp, paramsA.retMk);
    const resultsB = calculateAllProvinces(paramsB.productKey, paramsB.qty, paramsB.thc, paramsB.lp, paramsB.retMk);

    const comparison = [];
    for (let idx = 0; idx < resultsA.length; idx++) {
      const a = resultsA[idx];
      const b = resultsB[idx];
      if (!a || !b) continue;

      const cogsA = paramsA.cogsOverride !== null ? paramsA.cogsOverride : paramsA.lp * paramsA.cogsPct;
      const cogsB = paramsB.cogsOverride !== null && paramsB.cogsOverride !== undefined ? paramsB.cogsOverride : paramsB.lp * paramsB.cogsPct;
      const marginA = paramsA.lp > 0 ? (paramsA.lp - cogsA - a.totalExciseDuty) / paramsA.lp : 0;
      const marginB = paramsB.lp > 0 ? (paramsB.lp - cogsB - b.totalExciseDuty) / paramsB.lp : 0;

      comparison.push({
        province: a.province,
        provinceKey: a.provinceKey || Object.keys(PROVINCES)[idx],
        shelfA: a.preTaxRetailPrice,
        shelfB: b.preTaxRetailPrice,
        shelfDelta: b.preTaxRetailPrice - a.preTaxRetailPrice,
        marginA,
        marginB,
        marginDelta: marginB - marginA,
        landedA: a.landedCost,
        landedB: b.landedCost,
        landedDelta: b.landedCost - a.landedCost
      });
    }
    return comparison;
  }

  function renderScenarioSimulator(baseInputs) {
    const product = PRODUCT_TYPES[baseInputs.productKey];

    let html = `
      <h2>🔮 Scenario Simulator — What If?</h2>
      <p class="margin-intro">
        Compare your current pricing against a modified scenario. Change any variable in <strong>Scenario B</strong> to see the impact across all provinces.
      </p>

      <div class="scenario-inputs">
        <div class="scenario-col scenario-a">
          <h3>🔵 Scenario A — Current</h3>
          <div class="sc-field"><label>Product</label><span class="sc-val">${product.icon} ${product.label}</span></div>
          <div class="sc-field"><label>Quantity</label><span class="sc-val">${baseInputs.qty} ${product.unitLabel}</span></div>
          <div class="sc-field"><label>LP Cost</label><span class="sc-val">$${baseInputs.lp.toFixed(2)}</span></div>
          <div class="sc-field"><label>Retail Markup</label><span class="sc-val">${(baseInputs.retMk * 100).toFixed(0)}%</span></div>
          <div class="sc-field"><label>COGS</label><span class="sc-val">${baseInputs.cogsOverride !== null ? '$' + baseInputs.cogsOverride.toFixed(2) + ' (actual)' : '50% (est.)'}</span></div>
        </div>
        <div class="scenario-col scenario-b">
          <h3>🔴 Scenario B — Modified</h3>
          <div class="sc-field"><label>Product</label><span class="sc-val">${product.icon} ${product.label}</span></div>
          <div class="sc-field"><label>Quantity</label><span class="sc-val">${baseInputs.qty} ${product.unitLabel}</span></div>
          <div class="sc-field"><label>LP Cost</label><input type="number" id="scLpCost" value="${baseInputs.lp.toFixed(2)}" step="0.50" min="0"></div>
          <div class="sc-field"><label>Retail Markup</label><input type="number" id="scRetailMk" value="${(baseInputs.retMk * 100).toFixed(0)}" step="1" min="0" max="100" style="width:60px">%</div>
          <div class="sc-field"><label>COGS ($)</label><input type="number" id="scCogsDollar" value="${baseInputs.cogsOverride !== null ? baseInputs.cogsOverride.toFixed(2) : ''}" placeholder="${(baseInputs.lp * 0.50).toFixed(2)}" step="0.50" min="0" style="width:80px"></div>
        </div>
      </div>

      <div id="scenarioResults"></div>
    `;

    scenarioPanel.innerHTML = html;
    scenarioPanel.style.display = "block";
    scenarioPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    showExportBtn();

    // Initial render
    const paramsA = { ...baseInputs, cogsPct: 0.50, cogsOverride: baseInputs.cogsOverride };
    updateScenarioTable(paramsA, baseInputs);

    // Wire up live recalculation
    ["scLpCost", "scRetailMk", "scCogsDollar"].forEach(id => {
      document.getElementById(id).addEventListener("input", () => {
        updateScenarioTable(paramsA, baseInputs);
      });
    });
  }

  function updateScenarioTable(paramsA, baseInputs) {
    const lpB = parseFloat(document.getElementById("scLpCost").value) || paramsA.lp;
    const retMkB = (parseFloat(document.getElementById("scRetailMk").value) || 39) / 100;
    const cogsDollarRaw = document.getElementById("scCogsDollar").value.trim();
    const cogsBOverride = cogsDollarRaw !== '' ? parseFloat(cogsDollarRaw) : null;

    const paramsB = {
      ...baseInputs,
      lp: lpB,
      retMk: retMkB,
      cogsPct: 0.50,
      cogsOverride: cogsBOverride
    };

    const comparison = runScenarioComparison(paramsA, paramsB);

    // KPIs
    const avgShelfDelta = comparison.reduce((s, r) => s + r.shelfDelta, 0) / comparison.length;
    const avgMarginDelta = comparison.reduce((s, r) => s + r.marginDelta, 0) / comparison.length;
    const improvCount = comparison.filter(r => r.marginDelta > 0.001).length;
    const worseCount = comparison.filter(r => r.marginDelta < -0.001).length;

    let html = `
      <div class="margin-kpi-strip">
        <div class="kpi">
          <span class="kpi-label">Avg Shelf Δ</span>
          <span class="kpi-value ${avgShelfDelta > 0.01 ? 'delta-negative' : avgShelfDelta < -0.01 ? 'delta-positive' : 'delta-neutral'}">${avgShelfDelta >= 0 ? '+' : ''}${fmt(avgShelfDelta)}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Avg Margin Δ</span>
          <span class="kpi-value ${avgMarginDelta > 0.001 ? 'delta-positive' : avgMarginDelta < -0.001 ? 'delta-negative' : 'delta-neutral'}">${avgMarginDelta >= 0 ? '+' : ''}${pct(avgMarginDelta)}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Improved</span>
          <span class="kpi-value ${improvCount > 0 ? 'delta-positive' : ''}">${improvCount} / ${comparison.length}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Worse</span>
          <span class="kpi-value ${worseCount > 0 ? 'delta-negative' : ''}">${worseCount} / ${comparison.length}</span>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table margin-table">
          <thead>
            <tr>
              <th>Province</th>
              <th>Shelf A</th>
              <th>Shelf B</th>
              <th>Δ Shelf</th>
              <th>Margin A</th>
              <th>Margin B</th>
              <th>Δ Margin</th>
            </tr>
          </thead>
          <tbody>
    `;

    comparison.forEach(r => {
      const prov = PROVINCES[r.provinceKey];
      const shelfDeltaClass = r.shelfDelta > 0.01 ? 'delta-negative' : r.shelfDelta < -0.01 ? 'delta-positive' : 'delta-neutral';
      const marginDeltaClass = r.marginDelta > 0.001 ? 'delta-positive' : r.marginDelta < -0.001 ? 'delta-negative' : 'delta-neutral';
      const marginAClass = r.marginA >= 0.20 ? 'margin-good' : r.marginA >= 0 ? 'margin-ok' : 'margin-bad';
      const marginBClass = r.marginB >= 0.20 ? 'margin-good' : r.marginB >= 0 ? 'margin-ok' : 'margin-bad';

      html += `
        <tr>
          <td>${prov ? prov.flag : ''} ${r.province}</td>
          <td>${fmt(r.shelfA)}</td>
          <td>${fmt(r.shelfB)}</td>
          <td class="${shelfDeltaClass}">${r.shelfDelta >= 0 ? '+' : ''}${fmt(r.shelfDelta)}</td>
          <td class="${marginAClass}">${pct(r.marginA)}</td>
          <td class="${marginBClass}">${pct(r.marginB)}</td>
          <td class="${marginDeltaClass}">${r.marginDelta >= 0 ? '+' : ''}${pct(r.marginDelta)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <div class="margin-footnote">
        <p>🔮 Green deltas = improvement (lower shelf price or higher margin). Red = worse. Change Scenario B inputs above to re-simulate in real time.</p>
      </div>
    `;

    document.getElementById("scenarioResults").innerHTML = html;
  }

  function showError(msg) {
    resultsPanel.innerHTML = `<div class="error-message">${msg}</div>`;
    resultsPanel.classList.add("visible");
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    showExportBtn();
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

    // Final: Shelf Price (pre-tax)
    html += `
      <div class="pipeline-step final">
        <div class="step-number">🍁</div>
        <div class="step-content">
          <div class="step-label">Shelf Price (Pre-Tax)</div>
          <div class="step-value final-price">${fmt(r.preTaxRetailPrice)}</div>
          <div class="step-details">In-store tag price, before sales tax at register</div>
        </div>
      </div>
    `;

    html += `</div>`; // close pipeline

    // ── Summary Cards ──
    const i = getInputs();
    const cogs = getCogsValue(r.lpCost, i.cogsOverride);
    const totalOOP = cogs + r.totalExciseDuty;
    const netProfit = r.lpCost - totalOOP;
    const trueMargin = r.lpCost > 0 ? netProfit / r.lpCost : 0;
    const preExciseMargin = r.lpCost > 0 ? (r.lpCost - cogs) / r.lpCost : 0;

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
          <div class="sc-sub">${r.preTaxRetailPrice > 0 ? pct(r.lpCost / r.preTaxRetailPrice) + " of shelf price" : ""}</div>
        </div>
      </div>
    `;

    // ── LP Margin Cards ──
    html += `
      <div class="margin-summary">
        <h3>💰 Your Margin Breakdown <span class="margin-assumption">(${cogsAssumptionText(i.cogsOverride)})</span> ${cogsBadge(i.cogsOverride)}</h3>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="sc-label">${cogsLabel(i.cogsOverride)}</div>
            <div class="sc-value">${fmt(cogs)}</div>
            <div class="sc-sub">${i.cogsOverride !== null ? 'Your actual cost' : 'Production cost (est.)'}</div>
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
    showExportBtn();
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


  // ── Render Balanced Margin ──
  function renderMarginProtection(results, targetMargin, baseLPCost, product, productKey, retailMarkupPct, cogsOverride = null) {
    const totalCount = results.length;
    const protectedCount = results.filter(r => r.marginStatus === 'protected').length;
    const atRiskCount = results.filter(r => r.marginStatus === 'at-risk').length;
    const belowCount = results.filter(r => r.marginStatus === 'below-floor').length;
    const avgMargin = results.reduce((sum, r) => sum + r.actualMargin, 0) / totalCount;
    const worstResult = results[0]; // sorted ascending by margin
    const bestResult = results[results.length - 1];
    const avgLP = results.reduce((sum, r) => sum + r.recommendedLP, 0) / totalCount;
    const totalAlerts = results.reduce((sum, r) => sum + r.alerts.length, 0);
    const needsIncrease = results.filter(r => r.needsLPIncrease).length;
    const baseline = MARKET_BASELINES[productKey];

    // Margin health color
    const marginHealthClass = avgMargin >= 0.55 ? 'kpi-good' : avgMargin >= 0.40 ? 'kpi-ok' : 'kpi-bad';
    const protectionClass = protectedCount === totalCount ? 'kpi-good' : protectedCount >= 10 ? 'kpi-ok' : 'kpi-bad';
    const retPct = (retailMarkupPct * 100).toFixed(0);

    let html = `
      <h2>🛡️ Margin Protection — ${(targetMargin * 100).toFixed(0)}% Minimum ${cogsBadge(cogsOverride)}</h2>
      <p class="margin-intro">
        Enforcing a minimum <strong>${(targetMargin * 100).toFixed(0)}% post-excise margin</strong> across all 13 provinces.
        Your base LP of <strong>${fmt(baseLPCost)}</strong> is adjusted upward per province where margin falls short.
        ${cogsOverride !== null ? 'COGS = <strong>' + fmt(cogsOverride) + '</strong> (actual).' : 'COGS assumed at <strong>50%</strong> of LP.'}
      </p>

      <div class="mp-slider-row">
        <div class="balanced-slider-group">
          <label>
            Target Margin: <strong id="mpTargetLabel">${(targetMargin * 100).toFixed(0)}%</strong>
          </label>
          <input type="range" id="mpSlider"
            min="20" max="70"
            value="${(targetMargin * 100).toFixed(0)}" step="1">
          <div class="slider-labels">
            <span>20%</span>
            <span class="balanced-preset" data-val="40">40% Safe</span>
            <span class="balanced-preset" data-val="55">55% Target</span>
            <span class="balanced-preset" data-val="60">60% Premium</span>
            <span>70%</span>
          </div>
        </div>

        <div class="balanced-slider-group">
          <label>
            Retail Markup: <strong id="mpRetailLabel">${retPct}%</strong>
          </label>
          <input type="range" id="mpRetailSlider"
            min="0" max="100"
            value="${retPct}" step="1">
          <div class="slider-labels">
            <span>0%</span>
            <span class="balanced-preset mp-retail-preset" data-val="30">Private 30%</span>
            <span class="balanced-preset mp-retail-preset" data-val="35">Avg 35%</span>
            <span class="balanced-preset mp-retail-preset" data-val="39">OCS 39%</span>
            <span>100%</span>
          </div>
        </div>

        <div class="balanced-slider-group">
          <label>
            Monthly Overhead: <strong id="mpOverheadLabel">$10,000</strong>
          </label>
          <input type="range" id="mpOverheadSlider"
            min="0" max="100000"
            value="10000" step="500">
          <div class="slider-labels">
            <span>$0</span>
            <span class="balanced-preset mp-overhead-preset" data-val="5000">$5K</span>
            <span class="balanced-preset mp-overhead-preset" data-val="15000">$15K</span>
            <span class="balanced-preset mp-overhead-preset" data-val="30000">$30K</span>
            <span>$100K</span>
          </div>
        </div>
      </div>

      <div class="margin-kpi-strip">
        <div class="kpi">
          <span class="kpi-label">Protected</span>
          <span class="kpi-value ${protectionClass}">${protectedCount} / ${totalCount}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Avg Margin</span>
          <span class="kpi-value ${marginHealthClass}">${pct(avgMargin)}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Worst Province</span>
          <span class="kpi-value">${worstResult ? worstResult.province.split(' ')[0] : '—'} ${pct(worstResult ? worstResult.actualMargin : 0)}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">LP Increases Needed</span>
          <span class="kpi-value ${needsIncrease > 0 ? 'kpi-bad' : 'kpi-good'}">${needsIncrease}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Alerts</span>
          <span class="kpi-value ${totalAlerts > 0 ? 'kpi-bad' : 'kpi-good'}">${totalAlerts}</span>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table margin-table">
          <thead>
            <tr>
              <th>Province</th>
              <th>Min LP</th>
              <th>Rec. LP</th>
              <th>Excise</th>
              <th>Excise/LP</th>
              <th>Cash Outlay</th>
              <th>Net Profit</th>
              <th>Margin</th>
              <th>Shelf Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    results.forEach(r => {
      const prov = PROVINCES[r.provinceKey];
      const marginClass = r.actualMargin >= 0.55 ? 'margin-good' : r.actualMargin >= targetMargin - 0.005 ? 'margin-ok' : 'margin-bad';
      const exciseClass = r.excisePctOfLP > 0.30 ? 'margin-bad' : r.excisePctOfLP > 0.20 ? 'margin-ok' : '';
      const lpChange = r.lpAdjustment > 0.01 ? `<span class="mp-increase">+${fmt(r.lpAdjustment)}</span>` : '';

      const statusBadge = r.marginStatus === 'protected'
        ? '<span class="mp-badge mp-protected">🛡️ Protected</span>'
        : r.marginStatus === 'at-risk'
          ? '<span class="mp-badge mp-at-risk">⚠️ At Risk</span>'
          : '<span class="mp-badge mp-below">🚨 Below</span>';

      const alertIcons = r.alerts.length > 0
        ? `<span class="mp-alert-dot" title="${r.alerts.map(a => a.text).join('\n')}">${r.alerts.map(a => a.icon).join('')}</span>`
        : '';

      html += `
        <tr class="${r.marginStatus === 'below-floor' ? 'mp-row-danger' : r.marginStatus === 'at-risk' ? 'mp-row-warn' : ''}">
          <td>${prov.flag} ${r.province} ${alertIcons}</td>
          <td>${fmt(r.minLPforMargin)}</td>
          <td class="val-highlight">${fmt(r.recommendedLP)} ${lpChange}</td>
          <td class="${exciseClass}">${fmt(r.excise)}</td>
          <td class="${exciseClass}">${(r.excisePctOfLP * 100).toFixed(1)}%</td>
          <td>${fmt(r.cashOutlay)}</td>
          <td class="${r.netProfit >= 0 ? 'profit-good' : 'margin-bad'}">${fmt(r.netProfit)}</td>
          <td class="${marginClass}">${pct(r.actualMargin)}</td>
          <td>${fmt(r.shelfPrice)}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    // ── Breakeven & Cash Flow Section ──
    const overhead = parseFloat(document.getElementById('mpOverheadSlider')?.value || 10000);
    const avgProfit = results.reduce((s, r) => s + r.netProfit, 0) / totalCount;
    const avgCashOutlay = results.reduce((s, r) => s + r.cashOutlay, 0) / totalCount;
    const avgRecLP = avgLP;
    const worstProfit = worstResult ? worstResult.netProfit : 0;
    const bestProfit = bestResult ? bestResult.netProfit : 0;

    // Breakeven units per month = overhead / net profit per unit
    const avgBreakevenUnits = avgProfit > 0 ? Math.ceil(overhead / avgProfit) : Infinity;
    const worstBreakevenUnits = worstProfit > 0 ? Math.ceil(overhead / worstProfit) : Infinity;
    const bestBreakevenUnits = bestProfit > 0 ? Math.ceil(overhead / bestProfit) : Infinity;

    // Cash flow: working capital needed for one month's breakeven production
    const avgWorkingCapital = avgBreakevenUnits !== Infinity ? avgBreakevenUnits * avgCashOutlay : 0;
    // ROI per cycle = net profit / cash outlay
    const avgROI = avgCashOutlay > 0 ? avgProfit / avgCashOutlay : 0;
    // Capital efficiency = how many $ revenue per $ invested
    const capitalEfficiency = avgCashOutlay > 0 ? avgRecLP / avgCashOutlay : 0;

    html += `
      <div class="mp-cashflow-section">
        <h3>📈 Breakeven & Cash Flow Planning</h3>
        <p class="margin-intro">Based on monthly overhead of <strong>${fmt(overhead)}</strong>. Adjust with the slider above.</p>

        <div class="margin-kpi-strip">
          <div class="kpi">
            <span class="kpi-label">Avg Breakeven</span>
            <span class="kpi-value">${avgBreakevenUnits !== Infinity ? avgBreakevenUnits.toLocaleString() + ' units/mo' : '∞'}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Worst Breakeven</span>
            <span class="kpi-value kpi-bad">${worstBreakevenUnits !== Infinity ? worstBreakevenUnits.toLocaleString() + ' units/mo' : '∞'}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Best Breakeven</span>
            <span class="kpi-value kpi-good">${bestBreakevenUnits !== Infinity ? bestBreakevenUnits.toLocaleString() + ' units/mo' : '∞'}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Working Capital</span>
            <span class="kpi-value">${avgWorkingCapital > 0 ? fmt(avgWorkingCapital) : '—'}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">ROI/Cycle</span>
            <span class="kpi-value ${avgROI >= 0.30 ? 'kpi-good' : avgROI >= 0.15 ? 'kpi-ok' : 'kpi-bad'}">${(avgROI * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div class="mp-cashflow-grid">
          <div class="mp-cashflow-card">
            <strong>💰 Per Unit Cash Cycle</strong>
            <div class="mp-cycle-row"><span>Day 0:</span> <span>You pay COGS + Excise = <strong>${fmt(avgCashOutlay)}</strong></span></div>
            <div class="mp-cycle-row"><span>Day 1-14:</span> <span>Product in transit to distributor</span></div>
            <div class="mp-cycle-row"><span>Day 30-60:</span> <span>LP receives payment = <strong>${fmt(avgRecLP)}</strong></span></div>
            <div class="mp-cycle-row"><span>Net gain:</span> <span class="${avgProfit >= 0 ? 'profit-good' : 'margin-bad'}"><strong>${fmt(avgProfit)}</strong> per unit</span></div>
          </div>
          <div class="mp-cashflow-card">
            <strong>📊 Monthly Production Target</strong>
            <div class="mp-cycle-row"><span>Overhead:</span> <span>${fmt(overhead)}/mo</span></div>
            <div class="mp-cycle-row"><span>Units to break even:</span> <span><strong>${avgBreakevenUnits !== Infinity ? avgBreakevenUnits.toLocaleString() : '∞'}</strong></span></div>
            <div class="mp-cycle-row"><span>Capital needed:</span> <span><strong>${avgWorkingCapital > 0 ? fmt(avgWorkingCapital) : '—'}</strong></span></div>
            <div class="mp-cycle-row"><span>Capital efficiency:</span> <span><strong>${capitalEfficiency.toFixed(2)}x</strong> (${fmt(capitalEfficiency)} revenue per $1 invested)</span></div>
          </div>
        </div>

        <div class="mp-province-breakeven">
          <h4>Province Breakeven Comparison (units/month for ${fmt(overhead)} overhead)</h4>
          <div class="mp-breakeven-bars">
    `;

    // Sort by breakeven (best first)
    const breakevenSorted = [...results]
      .map(r => ({ ...r, beUnits: r.netProfit > 0 ? Math.ceil(overhead / r.netProfit) : Infinity }))
      .filter(r => r.beUnits !== Infinity)
      .sort((a, b) => a.beUnits - b.beUnits);

    const maxBE = breakevenSorted.length > 0 ? breakevenSorted[breakevenSorted.length - 1].beUnits : 1;

    breakevenSorted.forEach(r => {
      const prov = PROVINCES[r.provinceKey];
      const barWidth = maxBE > 0 ? (r.beUnits / maxBE * 100) : 0;
      const barClass = r.beUnits <= avgBreakevenUnits * 0.8 ? 'mp-be-good' : r.beUnits >= avgBreakevenUnits * 1.2 ? 'mp-be-bad' : 'mp-be-mid';

      html += `
        <div class="mp-be-row">
          <span class="mp-be-label">${prov.flag} ${r.province.split(' ')[0]}</span>
          <div class="mp-be-track">
            <div class="mp-be-fill ${barClass}" style="width:${barWidth}%"></div>
          </div>
          <span class="mp-be-value">${r.beUnits.toLocaleString()}</span>
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;

    // Risk summary
    if (totalAlerts > 0 || needsIncrease > 0) {
      const highExcise = results.filter(r => r.excisePctOfLP > 0.30);
      const highCash = results.filter(r => r.cashOutlayPct > 0.60);
      html += `
        <div class="mp-risk-summary">
          <h3>⚡ Risk Summary & Best Practices</h3>
          <div class="mp-risk-grid">
      `;
      if (needsIncrease > 0) {
        html += `<div class="mp-risk-card mp-risk-warn">
          <strong>📊 ${needsIncrease} province${needsIncrease > 1 ? 's' : ''} need LP increase</strong>
          <p>Your base LP of ${fmt(baseLPCost)} doesn't achieve ${(targetMargin * 100).toFixed(0)}% margin in all markets. Use the recommended LP prices above.</p>
        </div>`;
      }
      if (highExcise.length > 0) {
        html += `<div class="mp-risk-card mp-risk-warn">
          <strong>🚨 High Excise Burden (${highExcise.length} province${highExcise.length > 1 ? 's' : ''})</strong>
          <p>Excise exceeds 30% of LP cost. Reserve 40-50% of gross profit in a separate tax account. Consider batch size optimization to reduce per-unit testing costs.</p>
        </div>`;
      }
      if (highCash.length > 0) {
        html += `<div class="mp-risk-card mp-risk-danger">
          <strong>💸 Cash Flow Pressure (${highCash.length} province${highCash.length > 1 ? 's' : ''})</strong>
          <p>Cash outlay (COGS + excise) exceeds 60% of LP revenue. Maintain 6-9 month cash runway. Use COD or Net-7 terms for new buyers.</p>
        </div>`;
      }
      html += `
          </div>
        </div>
      `;
    }

    // ── Competitor Price Comparison ──
    if (baseline) {
      const avgRecommended = avgLP;

      // Calculate average shelf price across all provinces (pre-tax)
      const avgShelf = results.reduce((s, r) => s + r.shelfPrice, 0) / totalCount;

      html += `
        <div class="mp-competitor-section">
          <h3>\ud83c\udfaf Competitor Price Comparison</h3>
          <p class="margin-intro">Enter competitor shelf prices to see how your product stacks up. Prices should be <strong>pre-tax shelf prices</strong> (what's on the tag).</p>

          <div class="cp-input-area">
            <div class="cp-inputs" id="cpInputs">
      `;

      // Render existing competitor entries
      savedCompetitorPrices.forEach((comp, idx) => {
        html += `
          <div class="cp-row" data-idx="${idx}">
            <input type="text" class="cp-brand" placeholder="Brand name" value="${comp.brand}" data-idx="${idx}">
            <input type="number" class="cp-price" placeholder="Shelf price" value="${comp.price || ''}" step="0.01" min="0" data-idx="${idx}">
            <button class="cp-remove" data-idx="${idx}">\u2716</button>
          </div>
        `;
      });

      // Always show one empty row for adding
      html += `
            </div>
            <button class="cp-add-btn" id="cpAddBtn">+ Add Competitor</button>
          </div>
      `;

      // Comparison visualization (only if we have competitor data)
      const validComps = savedCompetitorPrices.filter(c => c.price > 0 && c.brand.trim());
      if (validComps.length > 0) {
        const allPrices = [{ brand: "You (avg shelf)", price: avgShelf, isYou: true }, ...validComps.map(c => ({ ...c, isYou: false }))];
        allPrices.sort((a, b) => a.price - b.price);
        const maxPrice = Math.max(...allPrices.map(p => p.price));
        const minPrice = Math.min(...allPrices.map(p => p.price));
        const avgCompPrice = validComps.reduce((s, c) => s + c.price, 0) / validComps.length;
        const yourVsAvg = avgShelf - avgCompPrice;
        const yourVsAvgPct = avgCompPrice > 0 ? (yourVsAvg / avgCompPrice * 100) : 0;

        const positionLabel = yourVsAvgPct <= -10 ? 'Well Below Market'
          : yourVsAvgPct <= -3 ? 'Below Market'
            : yourVsAvgPct <= 3 ? 'Market Rate'
              : yourVsAvgPct <= 10 ? 'Above Market'
                : 'Well Above Market';

        const positionClass = yourVsAvgPct <= -3 ? 'mp-pos-low'
          : yourVsAvgPct <= 3 ? 'mp-pos-mid'
            : 'mp-pos-high';

        const positionIcon = yourVsAvgPct <= -3 ? '\ud83d\udfe2'
          : yourVsAvgPct <= 3 ? '\ud83d\udfe1'
            : '\ud83d\udfe0';

        html += `
          <div class="cp-summary">
            <div class="margin-kpi-strip">
              <div class="kpi">
                <span class="kpi-label">Your Avg Shelf</span>
                <span class="kpi-value">${fmt(avgShelf)}</span>
              </div>
              <div class="kpi">
                <span class="kpi-label">Competitor Avg</span>
                <span class="kpi-value">${fmt(avgCompPrice)}</span>
              </div>
              <div class="kpi">
                <span class="kpi-label">Difference</span>
                <span class="kpi-value ${yourVsAvg >= 0 ? 'kpi-bad' : 'kpi-good'}">${yourVsAvg >= 0 ? '+' : ''}${fmt(yourVsAvg)}</span>
              </div>
              <div class="kpi">
                <span class="kpi-label">Position</span>
                <span class="kpi-value ${positionClass}">${positionIcon} ${positionLabel}</span>
              </div>
            </div>

            <div class="cp-bars">
        `;

        allPrices.forEach(p => {
          const barWidth = maxPrice > 0 ? (p.price / maxPrice * 100) : 0;
          const barClass = p.isYou ? 'cp-bar-you' : 'cp-bar-comp';
          const label = p.isYou ? `\u2b50 ${p.brand}` : p.brand;
          html += `
            <div class="cp-bar-row">
              <span class="cp-bar-label ${p.isYou ? 'cp-bar-label-you' : ''}">${label}</span>
              <div class="mp-be-track">
                <div class="mp-be-fill ${barClass}" style="width:${barWidth}%"></div>
              </div>
              <span class="cp-bar-price ${p.isYou ? 'cp-bar-label-you' : ''}">${fmt(p.price)}</span>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;

        // Alert if significantly above/below
        if (yourVsAvgPct > 10) {
          html += `<div class="mp-risk-card mp-risk-warn"><strong>\ud83d\udfe0 Priced Above Market</strong><p>Your avg shelf price is ${yourVsAvgPct.toFixed(0)}% above competitors. This may limit sell-through velocity unless justified by brand/quality differentiation.</p></div>`;
        } else if (yourVsAvgPct < -10) {
          html += `<div class="mp-risk-card" style="background:rgba(16,185,129,0.08);border-left:3px solid var(--accent-emerald)"><strong>\ud83d\udfe2 Priced Below Market</strong><p>Your avg shelf price is ${Math.abs(yourVsAvgPct).toFixed(0)}% below competitors. Good for velocity, but verify your margins are still protected above.</p></div>`;
        }
      }

      // Market baseline bar (always show)
      html += `
          <div class="cp-market-baseline">
            <h4>Industry Pricing Range \u2014 ${product.label}</h4>
            <div class="mp-market-bar">
              <div class="mp-bar-segment mp-bar-low" style="flex:${baseline.mid - baseline.low}">
                <span>Budget</span>
                <span>${fmt(baseline.low)}</span>
              </div>
              <div class="mp-bar-segment mp-bar-mid" style="flex:${baseline.high - baseline.mid}">
                <span>Market Avg</span>
                <span>${fmt(baseline.mid)}</span>
              </div>
              <div class="mp-bar-segment mp-bar-high" style="flex:${baseline.high * 0.5}">
                <span>Premium</span>
                <span>${fmt(baseline.high)}+</span>
              </div>
            </div>
            <p class="margin-footnote">\ud83d\udca1 Tip: Check <a href="https://hibuddy.ca" target="_blank" rel="noopener">hibuddy.ca</a> for live Ontario shelf prices to input above.</p>
          </div>
        </div>
      `;
    }

    html += `
      <div class="margin-footnote">
        <p>🛡️ <strong>Min LP</strong> = lowest LP price achieving ${(targetMargin * 100).toFixed(0)}% margin. <strong>Rec. LP</strong> = max(your base, min required).</p>
        <p>Industry best practice: cultivators target 40-60% gross margin pre-tax, with 15-25% post-tax cash margin.</p>
      </div>
    `;

    balancedPanel.innerHTML = html;
    balancedPanel.style.display = "block";
    balancedPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    showExportBtn();

    // Wire up interactive sliders
    const marginSlider = document.getElementById("mpSlider");
    const marginLabel = document.getElementById("mpTargetLabel");
    const retailSliderMP = document.getElementById("mpRetailSlider");
    const retailLabelMP = document.getElementById("mpRetailLabel");

    function rerunProtection(newMargin, newRetail) {
      lastProtectionMargin = newMargin;
      if (lastProtectionInputs) {
        const i = lastProtectionInputs;
        // Also sync the main page slider
        retailSlider.value = (newRetail * 100).toFixed(0);
        retailValueLabel.textContent = (newRetail * 100).toFixed(0) + '%';
        i.retMk = newRetail;
        const newResults = calculateMarginProtection(i.lp, newMargin, i.productKey, i.qty, i.thc, newRetail, i.cogsOverride);
        renderMarginProtection(newResults, newMargin, i.lp, product, productKey, newRetail, i.cogsOverride);
      }
    }

    marginSlider.addEventListener("input", () => {
      const newMargin = parseFloat(marginSlider.value) / 100;
      marginLabel.textContent = `${marginSlider.value}%`;
      rerunProtection(newMargin, retailMarkupPct);
    });

    retailSliderMP.addEventListener("input", () => {
      const newRetail = parseFloat(retailSliderMP.value) / 100;
      retailLabelMP.textContent = `${retailSliderMP.value}%`;
      rerunProtection(lastProtectionMargin, newRetail);
    });

    // Overhead slider
    const overheadSlider = document.getElementById("mpOverheadSlider");
    const overheadLabel = document.getElementById("mpOverheadLabel");
    if (overheadSlider) {
      overheadSlider.addEventListener("input", () => {
        overheadLabel.textContent = fmt(parseFloat(overheadSlider.value));
        // Rerun to update breakeven numbers
        rerunProtection(lastProtectionMargin, retailMarkupPct);
      });
    }

    // Wire up presets (margin)
    balancedPanel.querySelectorAll('.balanced-preset:not(.mp-retail-preset):not(.mp-overhead-preset)').forEach(el => {
      el.addEventListener('click', () => {
        marginSlider.value = el.dataset.val;
        marginSlider.dispatchEvent(new Event('input'));
      });
    });

    // Wire up presets (retail)
    balancedPanel.querySelectorAll('.mp-retail-preset').forEach(el => {
      el.addEventListener('click', () => {
        retailSliderMP.value = el.dataset.val;
        retailSliderMP.dispatchEvent(new Event('input'));
      });
    });

    // Wire up presets (overhead)
    balancedPanel.querySelectorAll('.mp-overhead-preset').forEach(el => {
      el.addEventListener('click', () => {
        if (overheadSlider) {
          overheadSlider.value = el.dataset.val;
          overheadSlider.dispatchEvent(new Event('input'));
        }
      });
    });

    // Wire up competitor inputs
    const cpAddBtn = document.getElementById('cpAddBtn');
    if (cpAddBtn) {
      cpAddBtn.addEventListener('click', () => {
        if (savedCompetitorPrices.length >= 5) return; // max 5
        savedCompetitorPrices.push({ brand: '', price: 0 });
        rerunProtection(lastProtectionMargin, retailMarkupPct);
      });
    }

    // Brand input changes
    balancedPanel.querySelectorAll('.cp-brand').forEach(el => {
      el.addEventListener('change', () => {
        const idx = parseInt(el.dataset.idx);
        if (savedCompetitorPrices[idx]) {
          savedCompetitorPrices[idx].brand = el.value;
          rerunProtection(lastProtectionMargin, retailMarkupPct);
        }
      });
    });

    // Price input changes
    balancedPanel.querySelectorAll('.cp-price').forEach(el => {
      el.addEventListener('change', () => {
        const idx = parseInt(el.dataset.idx);
        if (savedCompetitorPrices[idx]) {
          savedCompetitorPrices[idx].price = parseFloat(el.value) || 0;
          rerunProtection(lastProtectionMargin, retailMarkupPct);
        }
      });
    });

    // Remove competitor
    balancedPanel.querySelectorAll('.cp-remove').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        savedCompetitorPrices.splice(idx, 1);
        rerunProtection(lastProtectionMargin, retailMarkupPct);
      });
    });
  }
});
