export const PRODUCTS = [
  { key: "juice250", label: "250 ml juice", short: "Juice" },
  { key: "shot60", label: "60 ml shot", short: "Shot" },
  { key: "energy340", label: "340 ml energi", short: "Energi" },
  { key: "smoothie250", label: "250 ml smoothie", short: "Smoothie" },
  { key: "juice750", label: "750 ml juice", short: "750 ml" },
];

export const CREDIT_PRODUCTS = [
  { key: "juice250", label: "250 ml juice", weight: 1, step: 6 },
  { key: "shot60", label: "60 ml shot", weight: 0.5, step: 12 },
  { key: "energy340", label: "340 ml energi", weight: 1, step: 6 },
  { key: "smoothie250", label: "250 ml smoothie", weight: 1, step: 6 },
  { key: "juice750", label: "750 ml juice", weight: 2, step: 6 },
  { key: "bib5000", label: "5 L BiB", weight: 10, step: 6 },
];

export const CUSTOMER_PRODUCTS = [
  { key: "juice250_beetroot", label: "250 ml rødbede", weight: 1, step: 6, priceKey: "juice250", priceOffset: 0 },
  { key: "juice250_carrot", label: "250 ml gulerod", weight: 1, step: 6, priceKey: "juice250", priceOffset: 0 },
  { key: "juice250_strawberry", label: "250 ml jordbær", weight: 1, step: 6, priceKey: "juice250", priceOffset: 0 },
  { key: "juice250_apple", label: "250 ml æble", weight: 1, step: 6, priceKey: "juice250", priceOffset: 0 },
  { key: "juice250_spinach", label: "250 ml spinat", weight: 1, step: 6, priceKey: "juice250", priceOffset: 0.5 },
  { key: "juice250_orange", label: "250 ml appelsin", weight: 1, step: 6, priceKey: "juice250", priceOffset: 0.75 },
  { key: "smoothie250_avocado", label: "250 ml avocado smoothie", weight: 1, step: 6, priceKey: "smoothie250", priceOffset: 0 },
  { key: "smoothie250_strawberry", label: "250 ml jordbær smoothie", weight: 1, step: 6, priceKey: "smoothie250", priceOffset: 0 },
  { key: "smoothie250_mango", label: "250 ml mango smoothie", weight: 1, step: 6, priceKey: "smoothie250", priceOffset: 0 },
  { key: "shot60_ginger", label: "60 ml ingefær shot", weight: 0.5, step: 12, priceKey: "shot60", priceOffset: 0 },
  { key: "shot60_turmeric_chili", label: "60 ml gurkemeje/chili shot", weight: 0.5, step: 12, priceKey: "shot60", priceOffset: 0 },
  { key: "energy340_passion", label: "340 ml passion energi", weight: 1, step: 6, priceKey: "energy340", priceOffset: 0 },
  { key: "energy340_lime_lemon", label: "340 ml lime/citron energi", weight: 1, step: 6, priceKey: "energy340", priceOffset: 0 },
];

export function customerProductPrice(product, tier) {
  if (!product?.priceKey) return null;
  const basePrice = Number(tier?.prices?.[product.priceKey]);
  if (!Number.isFinite(basePrice)) return null;
  return basePrice + (Number(product.priceOffset) || 0);
}

export const DEFAULT_QUANTITIES = {
  juice250: 300,
  shot60: 0,
  energy340: 0,
  smoothie250: 0,
  juice750: 0,
  bib5000: 0,
};

export const DEFAULT_TIERS = [
  { name: "Standard", min: 0, prices: { juice250: 16.00, shot60: 8.00, energy340: 13.00, smoothie250: 17.00, juice750: 26.00 } },
  { name: "Select", min: 50, prices: { juice250: 15.25, shot60: 7.75, energy340: 12.75, smoothie250: 16.50, juice750: 25.50 } },
  { name: "Plus", min: 150, prices: { juice250: 14.50, shot60: 7.50, energy340: 12.50, smoothie250: 16.00, juice750: 25.00 } },
  { name: "Premium", min: 300, prices: { juice250: 13.75, shot60: 7.25, energy340: 12.25, smoothie250: 15.25, juice750: 24.50 } },
  { name: "Key Account", min: 500, prices: { juice250: 12.75, shot60: 7.00, energy340: 12.00, smoothie250: 14.50, juice750: 23.75 } },
];

export function cloneTiers(tiers = DEFAULT_TIERS) {
  return JSON.parse(JSON.stringify(tiers));
}

export function tierMax(tiers, index) {
  return index === tiers.length - 1 ? Infinity : tiers[index + 1].min - 1;
}

export function formatRange(tiers, index) {
  const max = tierMax(tiers, index);
  return max === Infinity ? `${tiers[index].min}+` : `${tiers[index].min}–${max}`;
}

export function getTier(tiers, rawVolume) {
  const volume = Math.max(0, Math.round((Number(rawVolume) || 0) * 100) / 100);
  let matchIndex = 0;
  tiers.forEach((tier, index) => {
    if (volume >= tier.min) matchIndex = index;
  });
  return { tier: tiers[matchIndex], index: matchIndex, volume };
}

export function calculateCredits(quantities) {
  return CREDIT_PRODUCTS.reduce((total, product) => {
    const quantity = Math.max(0, Math.floor(Number(quantities?.[product.key]) || 0));
    return total + quantity * product.weight;
  }, 0);
}

export function calculateWeeklyCredits(quantities, rawCadenceWeeks = 1) {
  const cadenceWeeks = [1, 2, 3, 4].includes(Number(rawCadenceWeeks)) ? Number(rawCadenceWeeks) : 1;
  return calculateCredits(quantities) / cadenceWeeks;
}

export function normalizePackQuantity(rawQuantity, step) {
  const safeStep = Number(step) > 0 ? Number(step) : 1;
  const quantity = Math.max(0, Math.floor(Number(rawQuantity) || 0));
  return Math.round(quantity / safeStep) * safeStep;
}

export function deliveryBreakdownForPostalCode(rawPostalCode, rawProductSubtotal = 0) {
  const postalCode = String(rawPostalCode ?? "").trim();
  if (!/^\d{4}$/.test(postalCode)) return null;
  const numericPostalCode = Number(postalCode);
  if (numericPostalCode < 1000 || numericPostalCode > 9999) return null;
  const productSubtotal = Math.max(0, Number(rawProductSubtotal) || 0);
  if (numericPostalCode <= 4000 && productSubtotal >= 2250) {
    return { deliveryFee: 0, palletFee: 0, total: 0, free: true, remote: false };
  }
  if (numericPostalCode < 3000) {
    return { deliveryFee: 95, palletFee: 0, total: 95, free: false, remote: false };
  }
  if (numericPostalCode <= 4000) {
    return { deliveryFee: 145, palletFee: 0, total: 145, free: false, remote: false };
  }
  return { deliveryFee: 595, palletFee: 135, total: 730, free: false, remote: true };
}

export function deliveryFeeForPostalCode(rawPostalCode, rawProductSubtotal = 0) {
  const breakdown = deliveryBreakdownForPostalCode(rawPostalCode, rawProductSubtotal);
  return breakdown ? breakdown.total : null;
}

export function calculateNextPriceGap(tiers, products, quantities, rawCadenceWeeks = 1) {
  const cadenceWeeks = [1, 2, 3, 4].includes(Number(rawCadenceWeeks)) ? Number(rawCadenceWeeks) : 1;
  const deliveryVolume = products.reduce((total, product) => {
    const quantity = Math.max(0, Math.floor(Number(quantities?.[product.key]) || 0));
    return total + quantity * product.weight;
  }, 0);
  const weeklyVolume = deliveryVolume / cadenceWeeks;
  let tierIndex = 0;
  tiers.forEach((tier, index) => {
    if (weeklyVolume >= tier.min) tierIndex = index;
  });

  if (deliveryVolume <= 0 || tierIndex >= tiers.length - 1) {
    return { available: false, extraProducts: 0, targetQuantities: {}, currentTierIndex: tierIndex, nextTierIndex: null, atTop: tierIndex >= tiers.length - 1 };
  }

  const targetDeliveryVolume = tiers[tierIndex + 1].min * cadenceWeeks;
  const scale = targetDeliveryVolume / deliveryVolume;
  const targetQuantities = {};
  let extraProducts = 0;

  products.forEach(product => {
    const currentQuantity = Math.max(0, Math.floor(Number(quantities?.[product.key]) || 0));
    const step = Number(product.step) > 0 ? Number(product.step) : 1;
    const targetQuantity = currentQuantity > 0 ? Math.ceil((currentQuantity * scale) / step) * step : 0;
    targetQuantities[product.key] = targetQuantity;
    extraProducts += Math.max(0, targetQuantity - currentQuantity);
  });

  return { available: extraProducts > 0, extraProducts, targetQuantities, currentTierIndex: tierIndex, nextTierIndex: tierIndex + 1, atTop: false };
}

export function calculatePricedRevenue(quantities, tier, rawCadenceWeeks = 1) {
  const cadenceWeeks = [1, 2, 3, 4].includes(Number(rawCadenceWeeks)) ? Number(rawCadenceWeeks) : 1;
  return PRODUCTS.reduce((total, product) => {
    const quantity = Math.max(0, Math.floor(Number(quantities?.[product.key]) || 0));
    return total + quantity * tier.prices[product.key] / cadenceWeeks;
  }, 0);
}

export function calculateEmployeeMetrics(quantities, tier, rawCadenceWeeks = 1, rawEmployees = 1) {
  const cadenceWeeks = [1, 2, 3, 4].includes(Number(rawCadenceWeeks)) ? Number(rawCadenceWeeks) : 1;
  const employees = Math.max(1, Math.floor(Number(rawEmployees) || 1));
  const unitsPerDelivery = CREDIT_PRODUCTS.reduce((total, product) => {
    return total + Math.max(0, Math.floor(Number(quantities?.[product.key]) || 0));
  }, 0);
  const unitsWeekly = unitsPerDelivery / cadenceWeeks;
  const revenueWeekly = calculatePricedRevenue(quantities, tier, cadenceWeeks);

  return {
    employees,
    unitsPerDelivery,
    unitsWeekly,
    revenueWeekly,
    unitsPerEmployeeWeekly: unitsWeekly / employees,
    pricePerEmployeeWeekly: revenueWeekly / employees,
    bibExcluded: Number(quantities?.bib5000) > 0,
  };
}

export function calculateQuoteTotals(quantities, tier, rawCadenceWeeks = 1, rawDeliveryFee = 0, rawBibPrice = null) {
  const cadenceWeeks = [1, 2, 3, 4].includes(Number(rawCadenceWeeks)) ? Number(rawCadenceWeeks) : 1;
  const deliveryFee = Math.max(0, Number(rawDeliveryFee) || 0);
  const productSubtotalDelivery = calculatePricedRevenue(quantities, tier, 1);
  const bibQuantity = Math.max(0, Math.floor(Number(quantities?.bib5000) || 0));
  const bibPrice = Number(rawBibPrice);
  const hasBibPrice = Number.isFinite(bibPrice) && bibPrice > 0;
  const bibSubtotalDelivery = hasBibPrice ? bibQuantity * bibPrice : 0;
  const totalExVatDelivery = productSubtotalDelivery + bibSubtotalDelivery + deliveryFee;
  const vatDelivery = totalExVatDelivery * 0.25;

  return {
    cadenceWeeks,
    deliveryFee,
    productSubtotalDelivery,
    bibQuantity,
    bibPrice: hasBibPrice ? bibPrice : null,
    bibSubtotalDelivery,
    bibPriceMissing: bibQuantity > 0 && !hasBibPrice,
    totalExVatDelivery,
    vatDelivery,
    totalInclVatDelivery: totalExVatDelivery + vatDelivery,
    totalExVatWeekly: totalExVatDelivery / cadenceWeeks,
    totalExVatMonthly: totalExVatDelivery / cadenceWeeks * 52 / 12,
  };
}

export function calculateUpgradeTrade(tiers, quantities, rawCadenceWeeks = 1) {
  const cadenceWeeks = [1, 2, 3, 4].includes(Number(rawCadenceWeeks)) ? Number(rawCadenceWeeks) : 1;
  const currentWeeklyCredits = calculateWeeklyCredits(quantities, cadenceWeeks);
  const current = getTier(tiers, currentWeeklyCredits);
  if (currentWeeklyCredits <= 0 || current.index >= tiers.length - 1) {
    return { available: false, atTop: current.index >= tiers.length - 1, current };
  }

  const nextTier = tiers[current.index + 1];
  const currentDeliveryCredits = calculateCredits(quantities);
  const targetDeliveryCredits = nextTier.min * cadenceWeeks;
  const scale = targetDeliveryCredits / currentDeliveryCredits;
  const upgradedQuantities = {};

  CREDIT_PRODUCTS.forEach(product => {
    const currentQuantity = Math.max(0, Math.floor(Number(quantities?.[product.key]) || 0));
    upgradedQuantities[product.key] = currentQuantity > 0
      ? Math.ceil((currentQuantity * scale) / product.step) * product.step
      : 0;
  });

  const upgradedWeeklyCredits = calculateWeeklyCredits(upgradedQuantities, cadenceWeeks);
  const currentRevenueWeekly = calculatePricedRevenue(quantities, current.tier, cadenceWeeks);
  const upgradedRevenueWeekly = calculatePricedRevenue(upgradedQuantities, nextTier, cadenceWeeks);
  const revenueAtNewPricesOnCurrentMix = calculatePricedRevenue(quantities, nextTier, cadenceWeeks);
  const discountCostWeekly = currentRevenueWeekly - revenueAtNewPricesOnCurrentMix;
  const addedRevenueWeekly = upgradedRevenueWeekly - revenueAtNewPricesOnCurrentMix;

  return {
    available: true,
    current,
    nextTier,
    upgradedQuantities,
    currentWeeklyCredits,
    upgradedWeeklyCredits,
    extraWeeklyCredits: upgradedWeeklyCredits - currentWeeklyCredits,
    currentRevenueWeekly,
    upgradedRevenueWeekly,
    discountCostWeekly,
    addedRevenueWeekly,
    netTradeWeekly: addedRevenueWeekly - discountCostWeekly,
    netTradeAnnual: (addedRevenueWeekly - discountCostWeekly) * 52,
    bibExcluded: Number(quantities?.bib5000) > 0,
  };
}

export function validateTiers(tiers) {
  const errors = [];
  if (!Array.isArray(tiers) || tiers.length < 2) return ["Modellen skal have mindst to prisgrupper."];
  if (tiers[0].min !== 0) errors.push("Standard skal begynde ved 0 credits.");

  tiers.forEach((tier, index) => {
    if (!Number.isInteger(tier.min) || tier.min < 0) errors.push(`${tier.name}: startvolumen skal være et positivt heltal.`);
    if (index > 0 && tier.min <= tiers[index - 1].min) errors.push(`${tier.name}: startvolumen skal være højere end gruppen før.`);
    PRODUCTS.forEach(product => {
      const price = tier.prices[product.key];
      if (!Number.isFinite(price) || price <= 0) errors.push(`${tier.name}: ${product.short} skal have en positiv pris.`);
      if (index > 0 && price > tiers[index - 1].prices[product.key]) errors.push(`${tier.name}: ${product.short} må ikke være dyrere end gruppen før.`);
    });
  });
  return errors;
}

export function runModelChecks(tiers) {
  const get = volume => getTier(tiers, volume).tier;
  const small = get(18);
  const xl = get(300);
  const key = get(700);
  const boundaryOk = tiers.every((tier, index) => index === 0 || get(tier.min - 1).name === tiers[index - 1].name) &&
    tiers.every(tier => get(tier.min).name === tier.name);
  const modelErrors = validateTiers(tiers);

  return [
    {
      title: "Mindste kunde rammer Standard",
      detail: `18 credits → ${small.name}: juice ${small.prices.juice250.toFixed(2)} / shot ${small.prices.shot60.toFixed(2)} DKK`,
      ok: small.name === "Standard" && small.prices.juice250 === 16 && small.prices.shot60 === 8,
    },
    {
      title: "Største kunde rammer ankeret",
      detail: `700 credits → ${key.name}: juice ${key.prices.juice250.toFixed(2)} / shot ${key.prices.shot60.toFixed(2)} DKK`,
      ok: key.name === "Key Account" && key.prices.juice250 === 12.75 && key.prices.shot60 === 7,
    },
    {
      title: "300 og 700 er adskilt",
      detail: `300 → ${xl.name} (${xl.prices.juice250.toFixed(2)}) · 700 → ${key.name} (${key.prices.juice250.toFixed(2)})`,
      ok: xl.name !== key.name && xl.prices.juice250 > key.prices.juice250,
    },
    {
      title: "Alle grænser er entydige",
      detail: modelErrors.length ? modelErrors[0] : "Ingen huller, overlap eller stigende volumenpriser.",
      ok: boundaryOk && modelErrors.length === 0,
    },
  ];
}
