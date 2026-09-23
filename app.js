import { CREDIT_PRODUCTS, CUSTOMER_PRODUCTS, DEFAULT_QUANTITIES, PRODUCTS, DEFAULT_TIERS, calculateCredits, calculateEmployeeMetrics, calculateNextPriceGap, calculateQuoteTotals, calculateUpgradeTrade, calculateWeeklyCredits, cloneTiers, customerProductPrice, deliveryBreakdownForPostalCode, formatRange, getTier, normalizePackQuantity, runModelChecks, validateTiers } from "./pricing.mjs";

const STORAGE_KEY = "frankly-b2b-pricing-v1";
const currency = new Intl.NumberFormat("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 });
const credits = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 2 });

const els = {
  quantityGrid: document.querySelector("#quantityGrid"),
  employeeInput: document.querySelector("#employeeInput"),
  cadenceSelect: document.querySelector("#cadenceSelect"),
  creditTotal: document.querySelector("#creditTotal"),
  creditFormula: document.querySelector("#creditFormula"),
  clearMixButton: document.querySelector("#clearMixButton"),
  tierName: document.querySelector("#tierName"),
  tierRange: document.querySelector("#tierRange"),
  priceCards: document.querySelector("#priceCards"),
  employeeMetrics: document.querySelector("#employeeMetrics"),
  upgradeTrade: document.querySelector("#upgradeTrade"),
  nextTier: document.querySelector("#nextTier"),
  tableBody: document.querySelector("#pricingTableBody"),
  editButton: document.querySelector("#editButton"),
  resetButton: document.querySelector("#resetButton"),
  quoteButton: document.querySelector("#quoteButton"),
  copyButton: document.querySelector("#copyButton"),
  quoteModal: document.querySelector("#quoteModal"),
  quoteCompany: document.querySelector("#quoteCompany"),
  quoteContact: document.querySelector("#quoteContact"),
  quotePostalCode: document.querySelector("#quotePostalCode"),
  quoteValidUntil: document.querySelector("#quoteValidUntil"),
  quoteBibPriceField: document.querySelector("#quoteBibPriceField"),
  quoteBibPrice: document.querySelector("#quoteBibPrice"),
  quoteNumber: document.querySelector("#quoteNumber"),
  quoteComment: document.querySelector("#quoteComment"),
  quotePreview: document.querySelector("#quotePreview"),
  copyQuoteButton: document.querySelector("#copyQuoteButton"),
  downloadQuoteButton: document.querySelector("#downloadQuoteButton"),
  printQuoteButton: document.querySelector("#printQuoteButton"),
  validationBanner: document.querySelector("#validationBanner"),
  checkGrid: document.querySelector("#checkGrid"),
  toast: document.querySelector("#toast"),
};

let tiers = loadTiers();
let quantities = { ...DEFAULT_QUANTITIES };
let employeeCount = 10;
let cadenceWeeks = 1;
let editing = false;
let toastTimer;
const generatedQuoteNumber = createQuoteNumber();

function loadTiers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const names = DEFAULT_TIERS.map(tier => tier.name);
    const migrated = Array.isArray(parsed)
      ? parsed.map((tier, index) => ({ ...tier, name: names[index] || tier.name }))
      : parsed;
    if (validateTiers(migrated).length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return cloneTiers();
  } catch {
    return cloneTiers();
  }
}

function saveTiers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tiers));
}

function normalizedVolume() {
  return calculateWeeklyCredits(quantities, cadenceWeeks);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function createQuoteNumber() {
  const now = new Date();
  const stamp = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
  const time = [String(now.getHours()).padStart(2, "0"), String(now.getMinutes()).padStart(2, "0")].join("");
  return `FQ-${stamp}-${time}`;
}

function isoDate(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function displayDate(value) {
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  return new Intl.DateTimeFormat("da-DK", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cadenceLabel() {
  return cadenceWeeks === 1 ? "Hver uge" : `Hver ${cadenceWeeks}. uge`;
}

function renderRecommendation() {
  const result = getTier(tiers, normalizedVolume());
  const deliveryCredits = calculateCredits(quantities);
  els.creditTotal.textContent = credits.format(result.volume);
  els.creditFormula.textContent = `${credits.format(deliveryCredits)} credits ÷ ${cadenceWeeks} ${cadenceWeeks === 1 ? "uge" : "uger"}`;
  els.tierName.textContent = result.tier.name;
  els.tierRange.textContent = `${formatRange(tiers, result.index)} / uge`;
  els.priceCards.innerHTML = PRODUCTS.map(product => `
    <div class="price-card">
      <span class="price-value">${currency.format(result.tier.prices[product.key])}</span>
      <span class="price-unit">${product.label}<br>DKK / stk.</span>
    </div>
  `).join("");
  renderEmployeeMetrics(result.tier);
  renderUpgradeTrade();

  if (result.index < tiers.length - 1) {
    const next = tiers[result.index + 1];
    const remaining = next.min - result.volume;
    els.nextTier.innerHTML = `<strong>${credits.format(remaining)} credits mere</strong> til ${next.name}<br>Juice falder til ${currency.format(next.prices.juice250)} DKK`;
  } else {
    els.nextTier.innerHTML = `<strong>Højeste prisgruppe</strong><br>Volumenankeret ved 700 credits pr. uge er dækket.`;
  }
}

function renderEmployeeMetrics(tier) {
  const metrics = calculateEmployeeMetrics(quantities, tier, cadenceWeeks, employeeCount);
  els.employeeMetrics.innerHTML = `
    <div class="employee-summary-heading">
      <p>MEDARBEJDERØKONOMI</p>
      <span>${integer.format(metrics.employees)} medarbejdere</span>
    </div>
    <div class="employee-metrics">
      <div class="employee-metric">
        <span>Enheder pr. medarbejder / uge</span>
        <strong>${credits.format(metrics.unitsPerEmployeeWeekly)}</strong>
      </div>
      <div class="employee-metric">
        <span>Pris pr. medarbejder / uge</span>
        <strong>${currency.format(metrics.pricePerEmployeeWeekly)} DKK</strong>
      </div>
    </div>
    <p class="employee-note">Enheder er det fysiske antal produkter. ${metrics.bibExcluded ? "BiB tæller som én enhed, men BiB-prisen er ikke medregnet i prisen." : "Prisen er ekskl. moms og baseret på den anbefalede prisgruppe."}</p>
  `;
}

function signedMoney(value) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${currency.format(Math.abs(value))} DKK`;
}

function renderUpgradeTrade() {
  const trade = calculateUpgradeTrade(tiers, quantities, cadenceWeeks);
  if (!trade.available) {
    els.upgradeTrade.innerHTML = `<p class="upgrade-empty"><strong>Netto trade ved opgradering</strong><br>${trade.atTop ? "Kunden er allerede i højeste prisgruppe." : "Indtast et produktmix for at beregne næste prisgruppe."}</p>`;
    return;
  }

  const extras = CREDIT_PRODUCTS
    .map(product => ({ label: product.label, quantity: trade.upgradedQuantities[product.key] - (quantities[product.key] || 0) }))
    .filter(item => item.quantity > 0)
    .map(item => `+${integer.format(item.quantity)} ${item.label}`)
    .join(" · ");
  const netClass = trade.netTradeWeekly >= 0 ? "net-positive" : "net-negative";

  els.upgradeTrade.innerHTML = `
    <div class="upgrade-heading">
      <div>
        <p class="upgrade-kicker">NETTO TRADE VED OPGRADERING</p>
        <p class="upgrade-title">${trade.current.tier.name} → ${trade.nextTier.name}</p>
      </div>
      <span class="upgrade-need">+${credits.format(trade.extraWeeklyCredits)} credits/uge</span>
    </div>
    <div class="trade-metrics">
      <div class="trade-metric">
        <span>Tabt på bedre pris</span>
        <strong>−${currency.format(trade.discountCostWeekly)} DKK</strong>
      </div>
      <div class="trade-metric">
        <span>Ny ekstra omsætning</span>
        <strong>+${currency.format(trade.addedRevenueWeekly)} DKK</strong>
      </div>
      <div class="trade-metric ${netClass}">
        <span>Netto pr. uge</span>
        <strong>${signedMoney(trade.netTradeWeekly)}</strong>
      </div>
    </div>
    <p class="upgrade-detail">Årlig nettoeffekt: <strong>${signedMoney(trade.netTradeAnnual)}</strong>. Beregnet ved at opskalere samme produktmix og afrunde til hele pakker.</p>
    <p class="upgrade-detail upgrade-extra">Ekstra pr. levering: ${extras || "Ingen ekstra varer"}</p>
    ${trade.bibExcluded ? `<p class="bib-warning">BiB tæller med i credits, men er udeladt af omsætningsberegningen, fordi BiB-prisen ikke findes i prisgruppemodellen.</p>` : ""}
  `;
}

function renderQuantityGrid() {
  els.quantityGrid.innerHTML = CREDIT_PRODUCTS.map(product => `
    <label class="quantity-field">
      <span class="quantity-label">
        <span>${product.label}</span>
        <span class="credit-weight">× ${credits.format(product.weight)} · pak á ${product.step}</span>
      </span>
      <input class="quantity-input" type="number" min="0" step="${product.step}" inputmode="numeric" value="${quantities[product.key] || 0}" data-quantity="${product.key}" data-step="${product.step}" aria-label="Antal ${product.label} pr. levering">
    </label>
  `).join("");
}

function getQuoteData() {
  const result = getTier(tiers, normalizedVolume());
  const postalCode = els.quotePostalCode.value.trim();
  const bibPrice = els.quoteBibPrice.value === "" ? null : Number(els.quoteBibPrice.value);
  const productTotals = calculateQuoteTotals(quantities, result.tier, cadenceWeeks, 0, bibPrice);
  const orderSubtotal = productTotals.productSubtotalDelivery + productTotals.bibSubtotalDelivery;
  const deliveryBreakdown = deliveryBreakdownForPostalCode(postalCode, orderSubtotal);
  const deliveryFeeKnown = deliveryBreakdown !== null;
  const deliveryFee = deliveryBreakdown?.total ?? 0;
  const totals = calculateQuoteTotals(quantities, result.tier, cadenceWeeks, deliveryFee, bibPrice);
  const metrics = calculateEmployeeMetrics(quantities, result.tier, cadenceWeeks, employeeCount);
  const company = els.quoteCompany.value.trim();
  const contact = els.quoteContact.value.trim();
  return {
    result,
    totals,
    metrics,
    company,
    contact,
    postalCode,
    deliveryBreakdown,
    deliveryFeeKnown,
    freeDelivery: deliveryBreakdown?.free === true,
    offerNumber: els.quoteNumber.value.trim() || generatedQuoteNumber,
    comment: els.quoteComment.value.trim(),
    validUntil: els.quoteValidUntil.value,
    employeeWeeklyPrice: totals.totalExVatWeekly / Math.max(1, employeeCount),
  };
}

function quoteProductRows(data) {
  const rows = PRODUCTS
    .filter(product => Number(quantities[product.key]) > 0)
    .map(product => {
      const quantity = Number(quantities[product.key]);
      const price = data.result.tier.prices[product.key];
      return `<tr><td>${escapeHtml(product.label)}</td><td>${integer.format(quantity)}</td><td>${currency.format(price)} DKK</td><td>${currency.format(quantity * price)} DKK</td></tr>`;
    });
  if (data.totals.bibQuantity > 0) {
    const price = data.totals.bibPrice;
    rows.push(`<tr><td>5 L BiB</td><td>${integer.format(data.totals.bibQuantity)}</td><td>${price ? `${currency.format(price)} DKK` : "Mangler pris"}</td><td>${price ? `${currency.format(data.totals.bibSubtotalDelivery)} DKK` : "—"}</td></tr>`);
  }
  return rows.length ? rows.join("") : `<tr><td colspan="4">Der er endnu ikke tilføjet produkter til tilbuddet.</td></tr>`;
}

function quoteDeliveryRows(data, rowClass, deliveryText) {
  if (data.deliveryBreakdown?.remote) {
    return `
      <div class="${rowClass}"><span>Levering</span><strong>${currency.format(data.deliveryBreakdown.deliveryFee)} DKK</strong></div>
      <div class="${rowClass}"><span>EUR-palle</span><strong>${currency.format(data.deliveryBreakdown.palletFee)} DKK</strong></div>
      <div class="${rowClass}"><span>Levering i alt</span><strong>${currency.format(data.deliveryBreakdown.total)} DKK</strong></div>
    `;
  }
  return `<div class="${rowClass}"><span>Levering</span><strong>${deliveryText}</strong></div>`;
}

function renderQuote() {
  const data = getQuoteData();
  const deliveryText = data.freeDelivery ? "Gratis" : data.deliveryFeeKnown ? `${currency.format(data.totals.deliveryFee)} DKK` : "Aftales";
  const totalExVatText = data.deliveryFeeKnown ? `${currency.format(data.totals.totalExVatDelivery)} DKK` : "—";
  const vatText = data.deliveryFeeKnown ? `${currency.format(data.totals.vatDelivery)} DKK` : "—";
  const totalInclVatText = data.deliveryFeeKnown ? `${currency.format(data.totals.totalInclVatDelivery)} DKK` : "—";
  const weeklyText = data.deliveryFeeKnown ? `${currency.format(data.totals.totalExVatWeekly)} DKK` : "—";
  const employeeText = data.deliveryFeeKnown ? `${currency.format(data.employeeWeeklyPrice)} DKK` : "—";
  els.quoteBibPriceField.hidden = data.totals.bibQuantity === 0;
  els.quotePreview.innerHTML = `
    <header class="quote-doc-header">
      <img class="quote-doc-logo" src="./assets/frankly-logo-transparent.png" alt="Frankly" />
      <div class="quote-doc-title">
        <h1>Pristilbud</h1>
        <p>Økologiske drikkevarer til arbejdspladsen</p>
      </div>
    </header>
    <div class="quote-doc-parties">
      <div>
        <p class="quote-doc-label">Til</p>
        <p><strong>${escapeHtml(data.company || "Kundens virksomhedsnavn")}</strong></p>
        <p>${escapeHtml(data.contact || "Kontaktperson ikke angivet")}</p>
      </div>
      <div class="quote-doc-meta">
        <p><span>Tilbudsnummer</span><strong>${escapeHtml(data.offerNumber)}</strong></p>
        <p><span>Dato</span><strong>${displayDate(isoDate(new Date()))}</strong></p>
        <p><span>Gyldig til</span><strong>${displayDate(data.validUntil)}</strong></p>
        <p><span>Postnummer</span><strong>${escapeHtml(data.postalCode || "Ikke angivet")}</strong></p>
        <p><span>Prisgruppe</span><strong>${escapeHtml(data.result.tier.name)}</strong></p>
      </div>
    </div>
    <table class="quote-table">
      <thead><tr><th>Produkt</th><th>Antal pr. levering</th><th>Pris pr. stk.</th><th>Beløb</th></tr></thead>
      <tbody>${quoteProductRows(data)}</tbody>
    </table>
    <div class="quote-totals">
      <div class="quote-total-row"><span>Produkter</span><strong>${currency.format(data.totals.productSubtotalDelivery + data.totals.bibSubtotalDelivery)} DKK</strong></div>
      ${quoteDeliveryRows(data, "quote-total-row", deliveryText)}
      <div class="quote-total-row grand"><span>Total pr. levering ekskl. moms</span><strong>${totalExVatText}</strong></div>
      <div class="quote-total-row"><span>Moms 25 %</span><strong>${vatText}</strong></div>
      <div class="quote-total-row"><span>Total inkl. moms</span><strong>${totalInclVatText}</strong></div>
    </div>
    <div class="quote-highlights">
      <div class="quote-highlight"><span>Levering</span><strong>${cadenceLabel()}</strong></div>
      <div class="quote-highlight"><span>Ugepris ekskl. moms</span><strong>${weeklyText}</strong></div>
      <div class="quote-highlight"><span>Pr. medarbejder / uge</span><strong>${employeeText}</strong></div>
    </div>
    ${data.comment ? `<div class="quote-comment"><span>Kommentar</span><p>${escapeHtml(data.comment)}</p></div>` : ""}
    ${!data.deliveryFeeKnown ? `<p class="quote-warning">Indtast et dansk postnummer fra 1000–9999 for at få levering med i tilbuddet.</p>` : ""}
    ${data.totals.bibPriceMissing ? `<p class="quote-warning">Tilbuddet er ikke komplet: Indtast en pris for 5 L BiB ovenfor.</p>` : ""}
    <footer class="quote-doc-footer">
      Tilbuddet omfatter ${integer.format(employeeCount)} medarbejdere og ${credits.format(data.metrics.unitsPerEmployeeWeekly)} enheder pr. medarbejder pr. uge. Alle priser er i DKK. Produktpriser er ekskl. moms og baseret på prisgruppen ${escapeHtml(data.result.tier.name)}. Ændringer i produktmix, leveringsfrekvens eller volumen kan ændre prisgruppen og tilbuddet.
    </footer>
  `;
}

function quoteAsText() {
  const data = getQuoteData();
  const lines = [
    `FRANKLY · PRISTILBUD ${data.offerNumber}`,
    `Til: ${data.company || "Kundens virksomhedsnavn"}`,
    `Kontakt: ${data.contact || "—"}`,
    `Postnummer: ${data.postalCode || "—"}`,
    `Dato: ${displayDate(isoDate(new Date()))}`,
    `Gyldig til: ${displayDate(data.validUntil)}`,
    `Prisgruppe: ${data.result.tier.name}`,
    "",
    ...PRODUCTS.filter(product => quantities[product.key] > 0).map(product => `${product.label}: ${integer.format(quantities[product.key])} stk. × ${currency.format(data.result.tier.prices[product.key])} DKK = ${currency.format(quantities[product.key] * data.result.tier.prices[product.key])} DKK`),
  ];
  if (data.totals.bibQuantity > 0) lines.push(`5 L BiB: ${integer.format(data.totals.bibQuantity)} stk. ${data.totals.bibPrice ? `× ${currency.format(data.totals.bibPrice)} DKK = ${currency.format(data.totals.bibSubtotalDelivery)} DKK` : "(pris mangler)"}`);
  if (data.comment) lines.push("", "Kommentar:", data.comment);
  lines.push("");
  if (data.deliveryBreakdown?.remote) {
    lines.push(
      `Levering: ${currency.format(data.deliveryBreakdown.deliveryFee)} DKK`,
      `EUR-palle: ${currency.format(data.deliveryBreakdown.palletFee)} DKK`,
      `Levering i alt: ${currency.format(data.deliveryBreakdown.total)} DKK`,
    );
  } else {
    lines.push(`Levering: ${data.freeDelivery ? "Gratis" : data.deliveryFeeKnown ? `${currency.format(data.totals.deliveryFee)} DKK` : "Aftales"}`);
  }
  lines.push(
    `Total pr. levering ekskl. moms: ${data.deliveryFeeKnown ? `${currency.format(data.totals.totalExVatDelivery)} DKK` : "—"}`,
    `Moms 25 %: ${data.deliveryFeeKnown ? `${currency.format(data.totals.vatDelivery)} DKK` : "—"}`,
    `Total inkl. moms: ${data.deliveryFeeKnown ? `${currency.format(data.totals.totalInclVatDelivery)} DKK` : "—"}`,
    `Leveringsfrekvens: ${cadenceLabel()}`,
    `Ugepris ekskl. moms: ${data.deliveryFeeKnown ? `${currency.format(data.totals.totalExVatWeekly)} DKK` : "—"}`,
    `Pris pr. medarbejder pr. uge: ${data.deliveryFeeKnown ? `${currency.format(data.employeeWeeklyPrice)} DKK ekskl. moms` : "—"}`,
  );
  return lines.join("\n");
}

function openQuote() {
  if (!els.quoteNumber.value) els.quoteNumber.value = generatedQuoteNumber;
  if (!els.quoteValidUntil.value) {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 14);
    els.quoteValidUntil.value = isoDate(validUntil);
  }
  renderQuote();
  els.quoteModal.hidden = false;
  document.body.style.overflow = "hidden";
  window.setTimeout(() => els.quoteCompany.focus(), 0);
}

function closeQuote() {
  els.quoteModal.hidden = true;
  document.body.style.overflow = "";
}

async function imageAsDataUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function downloadQuote() {
  renderQuote();
  const data = getQuoteData();
  const clone = els.quotePreview.cloneNode(true);
  const logo = clone.querySelector(".quote-doc-logo");
  try { logo.src = await imageAsDataUrl("./assets/frankly-logo-transparent.png"); } catch { /* The live URL remains as fallback. */ }
  const styles = `body{margin:0;padding:32px;color:#183026;background:#fff;font-family:Arial,sans-serif}.quote-document{max-width:820px;margin:auto}.quote-doc-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #113b2a}.quote-doc-logo{width:170px;height:42px;object-fit:cover}.quote-doc-title{text-align:right}.quote-doc-title h1{margin:0 0 5px;font-size:30px}.quote-doc-title p,.quote-doc-label,.quote-doc-footer{color:#5f6e65}.quote-doc-parties{display:grid;grid-template-columns:1.4fr 1fr;gap:30px;padding:24px 0}.quote-doc-parties p{margin:0 0 5px;font-size:12px}.quote-doc-label{font-size:9px;font-weight:bold;text-transform:uppercase}.quote-doc-meta{display:grid;grid-template-columns:1fr 1fr;gap:5px 15px}.quote-doc-meta p{display:flex;justify-content:space-between;border-bottom:1px solid #edf0ed;padding-bottom:4px}.quote-table{width:100%;border-collapse:collapse}.quote-table th,.quote-table td{padding:10px 8px;border-bottom:1px solid #e2e8e3;font-size:11px;text-align:right}.quote-table th{background:#f3f5f1;font-size:9px}.quote-table th:first-child,.quote-table td:first-child{text-align:left}.quote-totals{width:360px;max-width:100%;margin:18px 0 0 auto}.quote-total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:11px}.quote-total-row.grand{margin-top:5px;padding-top:10px;border-top:2px solid #113b2a;font-size:14px;font-weight:bold}.quote-highlights{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:26px}.quote-highlight{padding:13px;border-radius:10px;background:#e9f2ec}.quote-highlight span{display:block;margin-bottom:5px;color:#5f6e65;font-size:8px;text-transform:uppercase}.quote-highlight strong{font-size:15px}.quote-comment{margin-top:18px;padding:13px 15px;border-left:3px solid #2f7454;background:#f4f7f3}.quote-comment span{display:block;color:#5f6e65;font-size:8px;font-weight:bold;letter-spacing:.07em;text-transform:uppercase}.quote-comment p{margin:5px 0 0;white-space:pre-wrap;font-size:10px;line-height:1.55}.quote-doc-footer{margin-top:25px;padding-top:15px;border-top:1px solid #dfe5df;font-size:9px;line-height:1.5}.quote-warning{padding:10px;color:#a43b2e;background:#fff0ed}@media print{@page{size:A4;margin:0}body{padding:14mm 12mm}.quote-document{max-width:none}}`;
  const html = `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(data.offerNumber)}</title><style>${styles}</style></head><body>${clone.outerHTML}</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${(els.quoteCompany.value.trim() || "Frankly-pristilbud").replace(/[^a-z0-9æøå_-]+/gi, "-")}-${data.offerNumber.replace(/[^a-z0-9æøå_-]+/gi, "-")}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Tilbuddet er gemt som fil");
}

const CUSTOMER_PRODUCT_LABELS_EN = Object.freeze({
  juice250_beetroot: "250 ml beetroot juice",
  juice250_carrot: "250 ml carrot juice",
  juice250_strawberry: "250 ml strawberry juice",
  juice250_apple: "250 ml apple juice",
  juice250_spinach: "250 ml spinach juice",
  juice250_orange: "250 ml orange juice",
  smoothie250_avocado: "250 ml avocado smoothie",
  smoothie250_strawberry: "250 ml strawberry smoothie",
  smoothie250_mango: "250 ml mango smoothie",
  shot60_ginger: "60 ml ginger shot",
  shot60_turmeric_chili: "60 ml turmeric/chilli shot",
  energy340_passion: "340 ml passion fruit energy",
  energy340_lime_lemon: "340 ml lime/lemon energy",
});

const CUSTOMER_ENGLISH_REPLACEMENTS = [
  ['<html lang="da">', '<html lang="en">'],
  ['"da-DK"', '"en-GB"'],
  ["Frankly · Ordreberegner", "Frankly · Order Calculator"],
  ["Sammensæt jeres løsning", "Build your order"],
  ["Jeres behov", "Your requirements"],
  ["Virksomhed", "Company"],
  ["Faktureringsmail ikke angivet", "Invoice email not entered"],
  ["Telefonnummer ikke angivet", "Phone number not entered"],
  ["CVR ikke angivet", "CVR not entered"],
  ["Faktureringsmail", "Invoice email"],
  ["Telefonnr.", "Phone number"],
  ["Telefonnummer", "Phone number"],
  ["Kundens virksomhed", "Customer company"],
  ["Kontaktperson ikke angivet", "Contact person not entered"],
  ["Postnummer ikke angivet", "Postal code not entered"],
  ["Leveringsadresse ikke angivet", "Delivery address not entered"],
  ["Leveringsadresse", "Delivery address"],
  ["Tilbudsnummer (valgfrit)", "Quote number (optional)"],
  ["Antal medarbejdere", "Number of employees"],
  ["Leveringsfrekvens", "Delivery frequency"],
  ["Éngangsbestilling", "One-time order"],
  ["Ikke relevant", "Not applicable"],
  ["Kommentar til tilbuddet", "Quote comments"],
  ["95 DKK: 1000–2999 · 145 DKK: 3000–4000 · Gratis fra 2.250 DKK · 4001–9999: 595 DKK + 135 DKK EUR-palle", "DKK 95: 1000–2999 · DKK 145: 3000–4000 · Free from DKK 2,250 · 4001–9999: DKK 595 + DKK 135 EUR pallet"],
  ["Produkter pr. levering", "Products per delivery"],
  ["Produkter i bestillingen", "Products in the order"],
  ["Antal i bestillingen", "Quantity in the order"],
  ["Pris pr. medarbejder / uge", "Price per employee / week"],
  ["Enheder pr. medarbejder / uge", "Units per employee / week"],
  ["Pris pr. levering", "Price per delivery"],
  ["Pris pr. bestilling", "Price per order"],
  ["Vælg produkter for at se oversigten.", "Select products to see the summary."],
  ["Gem dette tilbud og send det til Frankly.", "Save this quote and send it to Frankly."],
  ["Kopiér tilbud", "Copy quote"],
  ["Gem tilbud", "Save quote"],
  ["Print / Gem som PDF", "Print / Save as PDF"],
  ["Økologiske drikkevarer til arbejdspladsen", "Organic drinks for the workplace"],
  ["Kontaktperson", "Contact person"],
  ["Postnr.", "Postal code"],
  ["Postnummer", "Postal code"],
  ["Tilbudsnummer", "Quote number"],
  ["Prisgruppe", "Price group"],
  ["Medarbejdere", "Employees"],
  ["<p class=\"clean-quote-label\">Til</p>", "<p class=\"clean-quote-label\">To</p>"],
  ["<thead><tr><th>Produkt</th><th>Antal pr. levering</th><th>Stykpris</th><th>Beløb</th></tr></thead>", "<thead><tr><th>Product</th><th>Quantity per delivery</th><th>Unit price</th><th>Amount</th></tr></thead>"],
  ["<thead><tr><th>Produkt</th><th>Antal</th><th>Stykpris</th><th>Beløb</th></tr></thead>", "<thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Amount</th></tr></thead>"],
  ["Vælg produkter for at se tilbuddet.", "Select products to see the quote."],
  ["Alle priser er i DKK og ekskl. moms, medmindre andet er angivet. Frankly bekræfter det endelige sortiment og levering.", "All prices are in DKK and exclude VAT unless otherwise stated. Frankly confirms the final selection and delivery."],
  ["Kundens virksomhed", "Customer company"],
  ["Der er endnu ikke valgt produkter.", "No products have been selected yet."],
  ["Antal produkter i alt", "Total number of products"],
  ["Total pr. levering ekskl. moms", "Total per delivery excl. VAT"],
  ["Total for bestillingen ekskl. moms", "Total for the order excl. VAT"],
  ["Total for bestillingen", "Total for the order"],
  ["Total inkl. 25 % moms", "Total incl. 25% VAT"],
  ["Total inkl. moms", "Total incl. VAT"],
  ["Moms 25 %", "VAT 25%"],
  ["Bestil ", "Order "],
  [" produkter yderligere og få en lavere pris pr. produkt.", " additional products and get a lower price per product."],
  ["Stykpris", "Unit price"],
  ["samme produktmix, hele pakker", "same product mix, full packs"],
  ["pr. levering til en bedre enhedspris", "per delivery for a better unit price"],
  ["i bestillingen til en bedre enhedspris", "in the order for a better unit price"],
  ["pr. levering til ", "per delivery to "],
  ["i bestillingen til ", "in the order to "],
  ["pr. levering", "per delivery"],
  ["i bestillingen", "in the order"],
  ["pr. uge", "per week"],
  ["Levering til dette postnummer aftales med Frankly.", "Delivery to this postal code is agreed with Frankly."],
  ["Indtast postnummer for at få levering med i prisen.", "Enter a postal code to include delivery in the price."],
  ["Indtast postnr.", "Enter postal code"],
  ["Ikke angivet", "Not entered"],
  ["Ingen produkter valgt", "No products selected"],
  ["pris aftales", "price to be agreed"],
  ["FRANKLY · PRISTILBUD", "FRANKLY · QUOTE"],
  ["Virksomhed:", "Company:"],
  ["Kontaktperson:", "Contact person:"],
  ["Postnummer:", "Postal code:"],
  ["Leveringsadresse:", "Delivery address:"],
  ["Levering:", "Delivery:"],
  ["Levering i alt", "Total delivery"],
  ["EUR-palle", "EUR pallet"],
  ["Pris pr. medarbejder pr. uge:", "Price per employee per week:"],
  ["Enheder pr. medarbejder pr. uge:", "Units per employee per week:"],
  ["Produkter pr. levering:", "Products per delivery:"],
  ["ekskl. moms", "excl. VAT"],
  ["Mangler:", "Required:"],
  ["Fordeling:", "Breakdown:"],
  ["Frankly bekræfter det endelige sortiment og levering.", "Frankly confirms the final selection and delivery."],
  ["Pakke á ", "Pack of "],
  ["Antal ", "Quantity of "],
  [" i stk. pr. levering", " in pcs. per delivery"],
  ["Antallet er tilpasset til en hel pakke: ", "Quantity adjusted to a full pack: "],
  ["Oversigten er kopieret", "The quote has been copied"],
  ["Kunne ikke kopiere automatisk", "Could not copy automatically"],
  ["Det rene pristilbud er gemt", "The quote has been saved"],
  ["Frankly pristilbud", "Frankly quote"],
  ["Frankly-pristilbud-", "Frankly-quote-"],
  ['var company=state.company||"kunde";', 'var company=state.company||"customer";'],
  ["Aftales", "To be agreed"],
  ["Gratis", "Free"],
  ["Hver 4. uge", "Every 4 weeks"],
  ["Hver 3. uge", "Every 3 weeks"],
  ["Hver 2. uge", "Every 2 weeks"],
  ["Hver uge", "Every week"],
  ["Hver ", "Every "],
  [". uge", " weeks"],
  ["produkt", "product"],
  ["produkter", "products"],
  ["ekstra", "additional"],
  ["Levering", "Delivery"],
  ["Produkter", "Products"],
  ["Kommentar", "Comments"],
  ["Pristilbud", "Quote"],
  ["stk.", "pcs."],
];

function translateCustomerVersionToEnglish(html) {
  return [...CUSTOMER_ENGLISH_REPLACEMENTS]
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((translated, [danish, english]) => translated.replaceAll(danish, english), html);
}

async function downloadCustomerVersion(language = "da") {
  const isEnglish = language === "en";
  const customerProducts = CUSTOMER_PRODUCTS.map(product => ({
    ...product,
    label: isEnglish ? CUSTOMER_PRODUCT_LABELS_EN[product.key] || product.label : product.label,
    priced: Boolean(product.priceKey),
  }));
  const customerTiers = tiers.map(tier => ({ name: tier.name, min: tier.min, prices: tier.prices }));
  const tiersJson = JSON.stringify(customerTiers).replaceAll("<", "\\u003c");
  const productsJson = JSON.stringify(customerProducts).replaceAll("<", "\\u003c");
  const deliveryBreakdownFunction = deliveryBreakdownForPostalCode.toString();
  const nextPriceGapFunction = calculateNextPriceGap.toString();
  const customerProductPriceFunction = customerProductPrice.toString();
  let logoMarkup = '<span class="logo-word">FRANKLY</span>';

  try {
    const logoData = await imageAsDataUrl("./assets/frankly-logo-transparent.png");
    logoMarkup = `<img class="brand-logo" src="${logoData}" alt="Frankly">`;
  } catch {
    // The text logo keeps the downloaded page self-contained if the image cannot be loaded.
  }

  let html = `<!doctype html>
<html lang="da">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="theme-color" content="#174c36">
  <title>Frankly · Ordreberegner</title>
  <style>
    :root{--ink:#10241a;--muted:#5f6e65;--green:#174c36;--green-dark:#113b2a;--green-soft:#e9f2ec;--cream:#f6f3e9;--paper:#fffdf7;--line:#dfe5df;--accent:#b7e3c5;--error:#a43b2e;--error-bg:#fff0ed}
    *{box-sizing:border-box}html{color-scheme:light}body{margin:0;color:var(--ink);background:var(--cream);font-family:"Avenir Next",Avenir,"Trebuchet MS",system-ui,sans-serif;-webkit-font-smoothing:antialiased}button,input,select,textarea{font:inherit}button{cursor:pointer}.page{width:min(1080px,calc(100% - 32px));margin:0 auto;padding:28px 0 56px}.topbar{display:flex;align-items:center;padding-bottom:24px;border-bottom:1px solid rgba(23,76,54,.15)}.brand-logo{display:block;width:162px;height:38px;object-fit:cover;object-position:center}.logo-word{color:var(--green);font-size:28px;font-weight:950;letter-spacing:.08em}.intro{padding:36px 0 24px}h1{margin:0;font-size:clamp(36px,5vw,52px);line-height:1;letter-spacing:-.045em}.workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,.72fr);gap:18px;align-items:start}.card{border:1px solid rgba(23,76,54,.12);border-radius:22px;background:var(--paper);box-shadow:0 16px 50px rgba(23,76,54,.08)}.form-card{padding:26px}.form-title{margin:0 0 16px;font-size:20px;letter-spacing:-.025em}.identity-grid,.setup-grid{display:grid;gap:10px}.identity-grid{grid-template-columns:1.15fr 1fr;margin-bottom:10px}.setup-grid{grid-template-columns:1fr 1fr}.field{display:flex;flex-direction:column;gap:6px}.field>span,.product-label{color:var(--muted);font-size:11px;font-weight:800}.field input,.field select,.field textarea,.product-field input{width:100%;min-height:46px;padding:10px 12px;border:1px solid #bdcbc1;border-radius:10px;outline:0;color:var(--ink);background:#fff;font-size:15px;font-weight:700}.field input:focus,.field select:focus,.field textarea:focus,.product-field:focus-within{border-color:#2f7454;box-shadow:0 0 0 3px rgba(47,116,84,.1)}.postal-note{color:#819087;font-size:9px;line-height:1.35}.setup-grid{margin:18px 0 20px;padding:15px;border-radius:14px;background:var(--green-soft)}.product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.product-field{padding:12px;border:1px solid var(--line);border-radius:12px;background:#fbfaf4}.product-field.category-start{grid-column:1}.quantity-control{display:grid;grid-template-columns:1fr auto;align-items:end;gap:8px;margin-top:8px}.product-field input{min-height:auto;margin:0;padding:0;border:0;border-radius:0;background:transparent;font-size:24px}.quantity-unit{padding-bottom:2px;color:var(--green);font-size:13px;font-weight:850}.pack-note{display:block;margin-top:4px;color:#819087;font-size:10px}.customer-comment{margin-top:16px}.customer-comment textarea{min-height:88px;resize:vertical;line-height:1.45}.result-card{position:sticky;top:18px;overflow:hidden;color:#fff;background:var(--green-dark)}.result-main{padding:26px}.result-heading{display:flex;align-items:center;justify-content:space-between;gap:14px}.result-main h2{margin:0;font-size:27px;letter-spacing:-.04em}.tier-badge{padding:7px 10px;border:1px solid rgba(255,255,255,.22);border-radius:999px;color:#dcebe1;background:rgba(255,255,255,.07);font-size:10px;font-weight:850;white-space:nowrap}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0}.metric{padding:14px;border:1px solid rgba(255,255,255,.13);border-radius:12px;background:rgba(255,255,255,.06)}.metric:first-child{grid-column:1/-1;background:var(--accent);color:var(--green-dark)}.metric span{display:block;margin-bottom:5px;color:#a9c8b5;font-size:9px;font-weight:800;line-height:1.35;text-transform:uppercase}.metric:first-child span{color:#41624f}.metric strong{display:block;font-size:22px;letter-spacing:-.035em}.metric:first-child strong{font-size:31px}.price-step{margin:0 0 16px;padding:12px;border-radius:10px;color:var(--green-dark);background:var(--accent);line-height:1.4}.price-step-label,.price-step-detail{display:block}.price-step-label{margin-bottom:3px;font-size:9px;font-weight:850;letter-spacing:.06em;text-transform:uppercase}.price-step strong{display:block;font-size:14px}.price-step-detail{margin-top:4px;color:#41624f;font-size:10px;font-weight:700}.order-lines{width:100%;border-collapse:collapse}.order-lines th,.order-lines td{padding:10px 5px;border-bottom:1px solid rgba(255,255,255,.12);font-size:11px;text-align:right}.order-lines th{color:#9ab8a5;font-size:8px;text-transform:uppercase}.order-lines th:first-child,.order-lines td:first-child{text-align:left}.totals{margin-top:15px}.total-row{display:flex;justify-content:space-between;gap:20px;padding:5px 0;color:#b9d1c1;font-size:11px}.total-row strong{color:#fff}.total-row.grand{margin-top:6px;padding-top:12px;border-top:1px solid rgba(255,255,255,.28);font-size:14px}.comment-preview{margin:12px 0 0;padding:11px 12px;border-radius:9px;background:rgba(255,255,255,.08)}.comment-preview span{display:block;color:#a9c8b5;font-size:9px;font-weight:850;text-transform:uppercase}.comment-preview p{margin:4px 0 0;white-space:pre-wrap;font-size:10px;line-height:1.5}.delivery-message{margin:12px 0 0;padding:9px 10px;border-radius:9px;color:#dcebe1;background:rgba(255,255,255,.08);font-size:10px;line-height:1.45}.notice{margin:12px 0 0;padding:10px;border-radius:9px;color:#ffe0d9;background:rgba(164,59,46,.28);font-size:10px;line-height:1.45}.result-footer{padding:16px 26px 24px;background:rgba(0,0,0,.11)}.result-footer p{margin:0 0 12px;color:#b9d1c1;font-size:10px;line-height:1.5}.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.actions button{min-height:42px;padding:0 12px;border-radius:10px;font-size:11px;font-weight:850}.secondary{border:1px solid rgba(255,255,255,.26);color:#fff;background:transparent}.secondary:hover{background:rgba(255,255,255,.08)}.primary{border:0;color:var(--green-dark);background:var(--accent)}.primary:hover{background:#c9ead3}.clean-quote{display:none;width:100%;min-height:297mm;padding:14mm 12mm;color:#183026;background:#fff;font-family:Arial,sans-serif}.clean-quote-header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:22px;border-bottom:2px solid var(--green-dark)}.clean-quote-header h1{margin:0 0 5px;font-size:30px}.clean-quote-header p{margin:0;color:var(--muted);font-size:11px}.clean-quote-parties{display:grid;grid-template-columns:1.25fr 1fr;gap:34px;padding:24px 0}.clean-quote-label{margin:0 0 7px;color:var(--muted);font-size:9px;font-weight:800;text-transform:uppercase}.clean-quote-parties p{margin:0 0 5px;font-size:12px}.clean-quote-meta{display:grid;gap:6px}.clean-quote-meta p{display:flex;justify-content:space-between;gap:18px;padding-bottom:5px;border-bottom:1px solid #e2e8e3}.clean-quote-meta span{color:var(--muted)}.clean-quote-table{width:100%;border-collapse:collapse}.clean-quote-table th,.clean-quote-table td{padding:10px 8px;border-bottom:1px solid #e2e8e3;font-size:11px;text-align:right}.clean-quote-table th{background:#f3f5f1;color:var(--muted);font-size:9px;text-transform:uppercase}.clean-quote-table th:first-child,.clean-quote-table td:first-child{text-align:left}.clean-quote-totals{width:360px;max-width:100%;margin:18px 0 0 auto}.clean-quote-total{display:flex;justify-content:space-between;gap:20px;padding:6px 0;font-size:11px}.clean-quote-total.grand{margin-top:5px;padding-top:10px;border-top:2px solid var(--green-dark);font-size:14px}.clean-quote-highlights{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:24px}.clean-quote-highlight{padding:13px;border-radius:10px;background:var(--green-soft)}.clean-quote-highlight span{display:block;margin-bottom:5px;color:var(--muted);font-size:8px;font-weight:800;text-transform:uppercase}.clean-quote-highlight strong{font-size:15px}.clean-quote-next,.clean-quote-comment{margin-top:16px;padding:12px 14px;border-left:3px solid #2f7454;background:#f4f7f3}.clean-quote-next span,.clean-quote-comment span{display:block;color:var(--muted);font-size:8px;font-weight:800;text-transform:uppercase}.clean-quote-next strong{display:block;margin-top:5px;font-size:11px}.clean-quote-comment p{margin:5px 0 0;white-space:pre-wrap;font-size:10px;line-height:1.55}.clean-quote-note{margin-top:24px;padding-top:14px;border-top:1px solid #dfe5df;color:var(--muted);font-size:9px;line-height:1.5}.toast{position:fixed;right:18px;bottom:18px;padding:11px 14px;border-radius:10px;color:#fff;background:#10241a;box-shadow:0 12px 36px rgba(0,0,0,.2);font-size:12px;font-weight:750;opacity:0;pointer-events:none;transform:translateY(7px);transition:180ms}.toast.show{opacity:1;transform:translateY(0)}
    .field-wide{grid-column:1/-1}.employee-field{gap:8px}.not-applicable{display:flex;align-items:center;gap:7px;color:var(--green-dark);font-size:12px;font-weight:800}.not-applicable input{width:16px;height:16px;min-height:16px;margin:0;padding:0;border:0;box-shadow:none;accent-color:var(--green-dark)}.field input:disabled{color:#819087;background:#eef1ed}
    .result-card{color:var(--ink);background:var(--paper)}.tier-badge{border-color:#bdcbc1;color:var(--green-dark);background:var(--green-soft)}.product-total{display:flex;align-items:baseline;justify-content:space-between;gap:18px;margin-top:16px;padding:13px 14px;border:1px solid #cdd9d0;border-radius:12px;background:var(--green-soft)}.product-total span{color:#41624f;font-size:10px;font-weight:850;text-transform:uppercase}.product-total strong{color:var(--green-dark);font-size:24px;letter-spacing:-.035em}.metric,.metric:first-child{border-color:var(--line);background:var(--green-soft)}.metric span{color:var(--muted)}.order-lines th,.order-lines td{border-color:var(--line)}.order-lines th{color:var(--muted)}.total-row{color:var(--muted)}.total-row strong{color:var(--ink)}.total-row.grand{border-color:#aebeb3}.comment-preview{border:1px solid var(--line);background:var(--green-soft)}.comment-preview span{color:var(--muted)}.delivery-message{color:var(--green-dark);background:var(--green-soft)}.result-footer{background:#f1eddf}.result-footer p{color:#41624f;font-size:12px;font-weight:750}.secondary{border-color:#9eb2a4;color:var(--green-dark);background:transparent}.secondary:hover{background:var(--green-soft)}.primary{color:#fff;background:var(--green-dark)}.primary:hover{background:#174c36}
    @media(max-width:820px){.workspace{grid-template-columns:1fr}.result-card{position:static}}
    @media(max-width:560px){.page{width:min(100% - 20px,1080px);padding-top:18px}.topbar{padding-bottom:18px}.brand-logo{width:140px;height:32px}.intro{padding:32px 0 22px}h1{font-size:41px}.form-card,.result-main{padding:20px}.identity-grid,.setup-grid,.product-grid{grid-template-columns:1fr}.metrics{grid-template-columns:1fr}.metric:first-child{grid-column:auto}.actions{grid-template-columns:1fr}.primary{grid-column:auto}}
    @media print{@page{size:A4;margin:0}body{background:#fff}.page{width:100%;padding:0}.topbar,.intro,.workspace,.toast{display:none!important}.clean-quote{display:block!important}}
  </style>
</head>
<body>
  <main class="page">
    <header class="topbar">
      ${logoMarkup}
    </header>

    <section class="intro" aria-labelledby="page-title">
      <h1 id="page-title">Sammensæt jeres løsning</h1>
    </section>

    <div class="workspace">
      <section class="card form-card" aria-labelledby="form-title">
        <div class="identity-grid">
          <label class="field field-wide"><span>Virksomhed</span><input id="company" type="text" placeholder="..." autocomplete="organization"></label>
          <label class="field"><span>CVR</span><input id="cvr" type="text" inputmode="numeric" maxlength="8" placeholder="..."></label>
          <label class="field"><span>Faktureringsmail</span><input id="invoiceEmail" type="email" placeholder="..." autocomplete="email"></label>
          <label class="field"><span>Postnr.</span><input id="postalCode" type="text" inputmode="numeric" maxlength="4" placeholder="..." autocomplete="postal-code"></label>
          <label class="field"><span>Leveringsadresse</span><input id="deliveryAddress" type="text" placeholder="..." autocomplete="street-address"></label>
          <label class="field"><span>Kontaktperson</span><input id="contact" type="text" placeholder="..." autocomplete="name"></label>
          <label class="field"><span>Telefonnr.</span><input id="phone" type="tel" placeholder="..." autocomplete="tel"></label>
        </div>
        <div class="setup-grid">
          <div class="field employee-field"><span>Antal medarbejdere</span><input id="employees" type="number" min="1" step="1" value="10" inputmode="numeric"><label class="not-applicable"><input id="employeesNotApplicable" type="checkbox"> <span>Ikke relevant</span></label></div>
          <label class="field"><span>Leveringsfrekvens</span><select id="cadence"><option value="1">Hver uge</option><option value="2">Hver 2. uge</option><option value="3">Hver 3. uge</option><option value="4">Hver 4. uge</option><option value="once">Éngangsbestilling</option></select></label>
        </div>
        <h2 id="form-title" class="form-title">Jeres behov</h2>
        <div id="productGrid" class="product-grid"></div>
        <label class="field customer-comment"><span>Kommentar til tilbuddet</span><textarea id="customerComment" rows="3" placeholder="..."></textarea></label>
      </section>

      <aside class="card result-card" aria-live="polite">
        <div class="result-main">
          <div class="result-heading"><h2>Pristilbud</h2><span id="currentPriceGroup" class="tier-badge">Prisgruppe · Standard</span></div>
          <div class="product-total"><span id="productTotalLabel">Produkter pr. levering</span><strong id="productTotal">0 stk.</strong></div>
          <div class="metrics">
            <div class="metric"><span>Pris pr. medarbejder / uge</span><strong id="perEmployee">0,00 DKK</strong></div>
            <div class="metric"><span>Enheder pr. medarbejder / uge</span><strong id="unitsPerEmployee">0</strong></div>
            <div class="metric"><span id="perDeliveryLabel">Pris pr. levering</span><strong id="perDelivery">0,00 DKK</strong></div>
          </div>
          <div id="nextPriceNotice" class="price-step" hidden></div>
          <table class="order-lines">
            <thead><tr><th>Produkt</th><th>Antal</th><th>Stykpris</th><th>Beløb</th></tr></thead>
            <tbody id="orderRows"><tr><td colspan="4">Vælg produkter for at se oversigten.</td></tr></tbody>
          </table>
          <div id="totals" class="totals"></div>
          <div id="commentPreview" class="comment-preview" hidden><span>Kommentar</span><p id="commentPreviewText"></p></div>
          <p id="deliveryNotice" class="delivery-message" hidden></p>
        </div>
        <div class="result-footer">
          <p>Gem dette tilbud og send det til Frankly.</p>
          <div class="actions">
            <button id="saveButton" class="secondary" type="button">Gem tilbud</button>
            <button id="printButton" class="primary" type="button">Print / Gem som PDF</button>
          </div>
        </div>
      </aside>
    </div>

    <article id="cleanQuote" class="clean-quote" aria-hidden="true">
      <header class="clean-quote-header">
        ${logoMarkup}
        <div><h1>Pristilbud</h1><p>Økologiske drikkevarer til arbejdspladsen</p></div>
      </header>
      <section class="clean-quote-parties">
        <div>
          <p class="clean-quote-label">Til</p>
          <p><strong id="cleanQuoteCompany">Kundens virksomhed</strong></p>
          <p id="cleanQuoteContact">Kontaktperson ikke angivet</p>
          <p id="cleanQuoteCvr">CVR ikke angivet</p>
          <p id="cleanQuoteInvoiceEmail">Faktureringsmail ikke angivet</p>
          <p id="cleanQuotePhone">Telefonnummer ikke angivet</p>
          <p id="cleanQuotePostalCode">Postnummer ikke angivet</p>
          <p id="cleanQuoteDeliveryAddress">Leveringsadresse ikke angivet</p>
        </div>
        <div class="clean-quote-meta">
          <p><span>Prisgruppe</span><strong id="cleanQuoteTier">Standard</strong></p>
          <p><span>Levering</span><strong id="cleanQuoteCadence">Hver uge</strong></p>
          <p><span>Medarbejdere</span><strong id="cleanQuoteEmployees">10</strong></p>
        </div>
      </section>
      <table class="clean-quote-table">
        <thead><tr><th>Produkt</th><th id="cleanQuoteQuantityHeading">Antal pr. levering</th><th>Stykpris</th><th>Beløb</th></tr></thead>
        <tbody id="cleanQuoteRows"><tr><td colspan="4">Vælg produkter for at se tilbuddet.</td></tr></tbody>
      </table>
      <div class="clean-quote-totals" id="cleanQuoteTotals"></div>
      <div class="clean-quote-highlights">
        <div class="clean-quote-highlight"><span>Pris pr. medarbejder / uge</span><strong id="cleanQuotePerEmployee">—</strong></div>
        <div class="clean-quote-highlight"><span>Enheder pr. medarbejder / uge</span><strong id="cleanQuoteUnitsPerEmployee">0</strong></div>
        <div class="clean-quote-highlight"><span id="cleanQuotePerDeliveryLabel">Pris pr. levering</span><strong id="cleanQuotePerDelivery">—</strong></div>
      </div>
      <div id="cleanQuoteComment" class="clean-quote-comment" hidden><span>Kommentar</span><p id="cleanQuoteCommentText"></p></div>
      <p class="clean-quote-note">Alle priser er i DKK og ekskl. moms, medmindre andet er angivet. Frankly bekræfter det endelige sortiment og levering.</p>
    </article>
  </main>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>

  <script>
    (function(){
      var tiers=${tiersJson};
      var products=${productsJson};
      var deliveryBreakdownForPostalCode=${deliveryBreakdownFunction};
      var calculateNextPriceGap=${nextPriceGapFunction};
      var customerProductPrice=${customerProductPriceFunction};
      var money=new Intl.NumberFormat("da-DK",{minimumFractionDigits:2,maximumFractionDigits:2});
      var number=new Intl.NumberFormat("da-DK",{maximumFractionDigits:2});
      var integers=new Intl.NumberFormat("da-DK",{maximumFractionDigits:0});
      var productGrid=document.getElementById("productGrid");
      var savedQuantities={};
      productGrid.querySelectorAll("[data-product]").forEach(function(input){savedQuantities[input.dataset.product]=Math.max(0,Math.floor(Number(input.value)||0));});
      var toastTimer;

      function safe(value){return String(value==null?"":value).replace(/[&<>"]/g,function(character){if(character==="&")return "&amp;";if(character==="<")return "&lt;";if(character===">")return "&gt;";return "&quot;";});}
      function showToast(message){var toast=document.getElementById("toast");window.clearTimeout(toastTimer);toast.textContent=message;toast.classList.add("show");toastTimer=window.setTimeout(function(){toast.classList.remove("show");},2200);}
      function quantity(product){var input=document.querySelector('[data-product="'+product.key+'"]');return Math.max(0,Math.floor(Number(input.value)||0));}
      function getState(){
        var cadenceValue=document.getElementById("cadence").value;
        var oneTime=cadenceValue==="once";
        var cadence=oneTime?1:Number(cadenceValue)||1;
        var employees=Math.max(1,Math.floor(Number(document.getElementById("employees").value)||1));
        var employeesRelevant=!document.getElementById("employeesNotApplicable").checked;
        var postalCode=document.getElementById("postalCode").value.trim();
        var deliveryAddress=document.getElementById("deliveryAddress").value.trim();
        var company=document.getElementById("company").value.trim();
        var contact=document.getElementById("contact").value.trim();
        var cvr=document.getElementById("cvr").value.trim();
        var invoiceEmail=document.getElementById("invoiceEmail").value.trim();
        var phone=document.getElementById("phone").value.trim();
        var comment=document.getElementById("customerComment").value.trim();
        var quantities={};products.forEach(function(product){quantities[product.key]=quantity(product);});
        var score=products.reduce(function(sum,product){return sum+quantities[product.key]*product.weight;},0)/cadence;
        var tier=tiers[0];tiers.forEach(function(candidate){if(score>=candidate.min)tier=candidate;});
        var unitsDelivery=products.reduce(function(sum,product){return sum+quantities[product.key];},0);
        var pricedSubtotal=products.reduce(function(sum,product){var price=customerProductPrice(product,tier);return sum+(price==null?0:quantities[product.key]*price);},0);
        var hasProducts=unitsDelivery>0;
        var deliveryBreakdown=deliveryBreakdownForPostalCode(postalCode,pricedSubtotal);
        var feeKnown=deliveryBreakdown!==null;
        var fee=hasProducts&&feeKnown?deliveryBreakdown.total:0;
        var deliveryCharge=hasProducts&&feeKnown?deliveryBreakdown.deliveryFee:0;
        var palletFee=hasProducts&&feeKnown?deliveryBreakdown.palletFee:0;
        var freeDelivery=hasProducts&&feeKnown&&deliveryBreakdown.free;
        var remoteDelivery=hasProducts&&feeKnown&&deliveryBreakdown.remote;
        var priceReady=!hasProducts||feeKnown;
        var totalDelivery=pricedSubtotal+fee;
        var totalWeekly=totalDelivery/cadence;
        var priceGap=calculateNextPriceGap(tiers,products,quantities,cadence);
        return {cadence:cadence,oneTime:oneTime,employees:employees,employeesRelevant:employeesRelevant,postalCode:postalCode,deliveryAddress:deliveryAddress,company:company,contact:contact,cvr:cvr,invoiceEmail:invoiceEmail,phone:phone,comment:comment,tier:tier,unitsDelivery:unitsDelivery,unitsWeekly:unitsDelivery/cadence,pricedSubtotal:pricedSubtotal,hasProducts:hasProducts,fee:fee,deliveryCharge:deliveryCharge,palletFee:palletFee,feeKnown:feeKnown,freeDelivery:freeDelivery,remoteDelivery:remoteDelivery,priceReady:priceReady,totalDelivery:totalDelivery,totalWeekly:totalWeekly,priceGap:priceGap};
      }
      function cadenceText(cadence,oneTime){return oneTime?"Éngangsbestilling":cadence===1?"Hver uge":"Hver "+cadence+". uge";}
      function deliveryRows(state,rowClass,deliveryText){if(state.remoteDelivery){return '<div class="'+rowClass+'"><span>Levering</span><strong>'+money.format(state.deliveryCharge)+' DKK</strong></div><div class="'+rowClass+'"><span>EUR-palle</span><strong>'+money.format(state.palletFee)+' DKK</strong></div><div class="'+rowClass+'"><span>Levering i alt</span><strong>'+money.format(state.fee)+' DKK</strong></div>';}return '<div class="'+rowClass+'"><span>Levering</span><strong>'+deliveryText+'</strong></div>';}
      function renderCleanQuote(state,selected,deliveryText,totalText,totalVatText){
        document.getElementById("cleanQuoteCompany").textContent=state.company||"Kundens virksomhed";
        document.getElementById("cleanQuoteContact").textContent=state.contact||"Kontaktperson ikke angivet";
        document.getElementById("cleanQuoteCvr").textContent=state.cvr?"CVR "+state.cvr:"CVR ikke angivet";
        document.getElementById("cleanQuoteInvoiceEmail").textContent=state.invoiceEmail||"Faktureringsmail ikke angivet";
        document.getElementById("cleanQuotePhone").textContent=state.phone||"Telefonnummer ikke angivet";
        document.getElementById("cleanQuotePostalCode").textContent=state.postalCode?"Postnummer "+state.postalCode:"Postnummer ikke angivet";
        document.getElementById("cleanQuoteDeliveryAddress").textContent=state.deliveryAddress||"Leveringsadresse ikke angivet";
        document.getElementById("cleanQuoteTier").textContent=state.tier.name;
        document.getElementById("cleanQuoteCadence").textContent=cadenceText(state.cadence,state.oneTime);
        document.getElementById("cleanQuoteEmployees").textContent=state.employeesRelevant?integers.format(state.employees):"Ikke relevant";
        document.getElementById("cleanQuoteQuantityHeading").textContent=state.oneTime?"Antal i bestillingen":"Antal pr. levering";
        document.getElementById("cleanQuoteRows").innerHTML=selected.length?selected.map(function(product){var amount=quantity(product);var price=customerProductPrice(product,state.tier);return "<tr><td>"+safe(product.label)+"</td><td>"+integers.format(amount)+"</td><td>"+(price==null?"Aftales":money.format(price)+" DKK")+"</td><td>"+(price==null?"—":money.format(amount*price)+" DKK")+"</td></tr>";}).join(""):'<tr><td colspan="4">Der er endnu ikke valgt produkter.</td></tr>';
        document.getElementById("cleanQuoteTotals").innerHTML='<div class="clean-quote-total"><span>Antal produkter i alt</span><strong>'+integers.format(state.unitsDelivery)+' stk.</strong></div><div class="clean-quote-total"><span>Produkter</span><strong>'+money.format(state.pricedSubtotal)+' DKK</strong></div>'+deliveryRows(state,"clean-quote-total",deliveryText)+'<div class="clean-quote-total grand"><span>'+(state.oneTime?"Total for bestillingen ekskl. moms":"Total pr. levering ekskl. moms")+'</span><strong>'+totalText+'</strong></div><div class="clean-quote-total"><span>Moms 25 %</span><strong>'+(state.priceReady?money.format(state.totalDelivery*.25)+" DKK":"—")+'</strong></div><div class="clean-quote-total"><span>Total inkl. moms</span><strong>'+totalVatText+'</strong></div>';
        var employeeMetricsReady=state.employeesRelevant&&!state.oneTime;
        document.getElementById("cleanQuotePerEmployee").textContent=employeeMetricsReady?money.format(state.totalWeekly/state.employees)+" DKK":"Ikke relevant";
        document.getElementById("cleanQuoteUnitsPerEmployee").textContent=employeeMetricsReady?number.format(state.unitsWeekly/state.employees):"Ikke relevant";
        document.getElementById("cleanQuotePerDeliveryLabel").textContent=state.oneTime?"Pris pr. bestilling":"Pris pr. levering";
        document.getElementById("cleanQuotePerDelivery").textContent=totalText;
        var cleanComment=document.getElementById("cleanQuoteComment");cleanComment.hidden=!state.comment;document.getElementById("cleanQuoteCommentText").textContent=state.comment;
      }
      function render(){
        var state=getState();
        document.getElementById("employees").value=state.employees;
        document.getElementById("employees").disabled=!state.employeesRelevant;
        document.getElementById("currentPriceGroup").textContent="Prisgruppe · "+state.tier.name;
        var employeeMetricsReady=state.employeesRelevant&&!state.oneTime;
        document.getElementById("perEmployee").textContent=employeeMetricsReady?money.format(state.totalWeekly/state.employees)+" DKK":"Ikke relevant";
        document.getElementById("unitsPerEmployee").textContent=employeeMetricsReady?number.format(state.unitsWeekly/state.employees):"Ikke relevant";
        document.getElementById("perDeliveryLabel").textContent=state.oneTime?"Pris pr. bestilling":"Pris pr. levering";
        document.getElementById("perDelivery").textContent=state.priceReady?money.format(state.totalDelivery)+" DKK":"—";
        document.getElementById("productTotalLabel").textContent=state.oneTime?"Produkter i bestillingen":"Produkter pr. levering";
        document.getElementById("productTotal").textContent=integers.format(state.unitsDelivery)+" stk.";
        var priceNotice=document.getElementById("nextPriceNotice");priceNotice.hidden=!state.priceGap.available;if(state.priceGap.available){priceNotice.innerHTML='<strong>Bestil '+integers.format(state.priceGap.extraProducts)+' produkter yderligere og få en lavere pris pr. produkt.</strong>';}
        var selected=products.filter(function(product){return quantity(product)>0;});
        document.getElementById("orderRows").innerHTML=selected.length?selected.map(function(product){
          var amount=quantity(product);var price=customerProductPrice(product,state.tier);
          return "<tr><td>"+safe(product.label)+"</td><td>"+integers.format(amount)+"</td><td>"+(price==null?"Aftales":money.format(price)+" DKK")+"</td><td>"+(price==null?"—":money.format(amount*price)+" DKK")+"</td></tr>";
        }).join(""):'<tr><td colspan="4">Vælg produkter for at se oversigten.</td></tr>';
        var deliveryText=!state.hasProducts?money.format(0)+" DKK":state.freeDelivery?"Gratis":state.feeKnown?money.format(state.fee)+" DKK":state.postalCode?"Aftales":"Indtast postnr.";var totalText=state.priceReady?money.format(state.totalDelivery)+" DKK":"—";var totalVatText=state.priceReady?money.format(state.totalDelivery*1.25)+" DKK":"—";
        document.getElementById("totals").innerHTML='<div class="total-row"><span>Produkter</span><strong>'+money.format(state.pricedSubtotal)+' DKK</strong></div>'+deliveryRows(state,"total-row",deliveryText)+'<div class="total-row grand"><span>'+(state.oneTime?"Total for bestillingen":"Total pr. levering")+'</span><strong>'+totalText+'</strong></div><div class="total-row"><span>Total inkl. 25 % moms</span><strong>'+totalVatText+'</strong></div>';
        var comment=state.comment;var commentPreview=document.getElementById("commentPreview");commentPreview.hidden=!comment;document.getElementById("commentPreviewText").textContent=comment;
        var deliveryNotice=document.getElementById("deliveryNotice");deliveryNotice.hidden=!state.hasProducts||state.feeKnown;deliveryNotice.textContent=state.postalCode?"Levering til dette postnummer aftales med Frankly.":"Indtast postnummer for at få levering med i prisen.";
        renderCleanQuote(state,selected,deliveryText,totalText,totalVatText);
      }
      function summaryText(){
        var state=getState();var company=state.company||"Ikke angivet";var contact=state.contact||"Ikke angivet";var postalCode=state.postalCode||"Ikke angivet";
        var lines=["FRANKLY · PRISTILBUD"];
        lines.push("Virksomhed: "+company,"Kontaktperson: "+contact,"CVR: "+(state.cvr||"Ikke angivet"),"Faktureringsmail: "+(state.invoiceEmail||"Ikke angivet"),"Telefonnummer: "+(state.phone||"Ikke angivet"),"Postnummer: "+postalCode,"Leveringsadresse: "+(state.deliveryAddress||"Ikke angivet"),"Antal medarbejdere: "+(state.employeesRelevant?integers.format(state.employees):"Ikke relevant"),"Levering: "+cadenceText(state.cadence,state.oneTime),"Prisgruppe: "+state.tier.name,"",state.oneTime?"Produkter i bestillingen:":"Produkter pr. levering:");
        var selected=products.filter(function(product){return quantity(product)>0;});
        if(!selected.length)lines.push("Ingen produkter valgt");
        selected.forEach(function(product){var amount=quantity(product);var price=customerProductPrice(product,state.tier);lines.push("- "+product.label+": "+integers.format(amount)+" stk."+(price==null?" · pris aftales":" × "+money.format(price)+" DKK = "+money.format(amount*price)+" DKK"));});
        var deliverySummary=!state.hasProducts?money.format(0)+" DKK":state.freeDelivery?"Gratis":state.feeKnown?money.format(state.fee)+" DKK":"Aftales";var totalSummary=state.priceReady?money.format(state.totalDelivery)+" DKK":"—";var totalVatSummary=state.priceReady?money.format(state.totalDelivery*1.25)+" DKK":"—";var employeeMetricsReady=state.employeesRelevant&&!state.oneTime;var employeeSummary=employeeMetricsReady?money.format(state.totalWeekly/state.employees)+" DKK ekskl. moms":"Ikke relevant";var employeeUnitsSummary=employeeMetricsReady?number.format(state.unitsWeekly/state.employees):"Ikke relevant";
        lines.push("");if(state.remoteDelivery){lines.push("Levering: "+money.format(state.deliveryCharge)+" DKK","EUR-palle: "+money.format(state.palletFee)+" DKK","Levering i alt: "+money.format(state.fee)+" DKK");}else{lines.push("Levering: "+deliverySummary);}lines.push((state.oneTime?"Total for bestillingen ekskl. moms: ":"Total pr. levering ekskl. moms: ")+totalSummary,"Total inkl. moms: "+totalVatSummary,"Pris pr. medarbejder pr. uge: "+employeeSummary,"Enheder pr. medarbejder pr. uge: "+employeeUnitsSummary);
        if(state.priceGap.available){lines.push("Bestil "+integers.format(state.priceGap.extraProducts)+" produkter yderligere og få en lavere pris pr. produkt.");}
        if(state.comment)lines.push("","Kommentar:",state.comment);
        lines.push("","Frankly bekræfter det endelige sortiment og levering.");return lines.join("\\n");
      }
      function productMarkup(product){var saved=savedQuantities[product.key]||0;var categoryStart=product.key==="shot60_ginger"?" category-start":"";return '<label class="product-field'+categoryStart+'"><span class="product-label">'+safe(product.label)+'</span><span class="quantity-control"><input type="number" min="0" step="'+product.step+'" value="'+saved+'" inputmode="numeric" data-product="'+product.key+'" aria-label="Antal '+safe(product.label)+' i stk. pr. levering"><span class="quantity-unit">stk.</span></span><span class="pack-note">Pakke á '+product.step+' stk.</span></label>';}
      productGrid.innerHTML=products.map(productMarkup).join("");
      document.addEventListener("input",function(event){if(event.target.matches("input,select,textarea"))render();});
      document.addEventListener("change",function(event){
        if(event.target.matches("[data-product]")){var step=Number(event.target.step)||1;var entered=Math.max(0,Math.floor(Number(event.target.value)||0));var normalized=Math.round(entered/step)*step;event.target.value=normalized;if(normalized!==entered)showToast("Antallet er tilpasset til en hel pakke: "+integers.format(normalized));}
        render();
      });
      document.getElementById("saveButton").addEventListener("click",function(){
        render();var state=getState();var quote=document.getElementById("cleanQuote").cloneNode(true);quote.removeAttribute("aria-hidden");quote.style.display="block";var styles=document.querySelector("style").textContent;var content='<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Frankly pristilbud</title><style>'+styles+'</style></head><body>'+quote.outerHTML+'</body></html>';var blob=new Blob([content],{type:"text/html;charset=utf-8"});var link=document.createElement("a");var company=state.company||"kunde";link.href=URL.createObjectURL(blob);link.download=("Frankly-pristilbud-"+company).replace(/[^a-z0-9æøå_-]+/gi,"-")+".html";link.click();URL.revokeObjectURL(link.href);showToast("Det rene pristilbud er gemt");
      });
      document.getElementById("printButton").addEventListener("click",function(){render();window.print();});
      render();
    })();
  </script>
</body>
</html>`;

  if (isEnglish) html = translateCustomerVersionToEnglish(html);

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = isEnglish ? "Order-Calculator.html" : "Ordreberegner.html";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Kundeversionen er downloadet");
}

function tableCell(tier, tierIndex, product) {
  if (!editing) return `${currency.format(tier.prices[product.key])} DKK`;
  return `<input class="price-input" type="number" min="0.01" step="0.25" value="${tier.prices[product.key].toFixed(2)}" data-tier="${tierIndex}" data-product="${product.key}" aria-label="${tier.name} ${product.label}"><span class="input-suffix">DKK</span>`;
}

function rangeCell(tier, index) {
  if (!editing || index === 0) return `${formatRange(tiers, index)} cr.`;
  return `<input class="min-input" type="number" min="1" step="1" value="${tier.min}" data-tier="${index}" aria-label="${tier.name} startgrænse"><span class="input-suffix">+ cr.</span>`;
}

function renderTable() {
  const active = getTier(tiers, normalizedVolume()).index;
  els.tableBody.innerHTML = tiers.map((tier, index) => `
    <tr class="${index === active ? "active-row" : ""}">
      <td class="tier-name-cell">${tier.name}</td>
      <td>${rangeCell(tier, index)}</td>
      ${PRODUCTS.map(product => `<td>${tableCell(tier, index, product)}</td>`).join("")}
    </tr>
  `).join("");
}

function renderChecks() {
  els.checkGrid.innerHTML = runModelChecks(tiers).map(check => `
    <article class="check-item ${check.ok ? "" : "failed"}">
      <span class="check-icon" aria-hidden="true">${check.ok ? "✓" : "!"}</span>
      <div>
        <p class="check-title">${check.title}</p>
        <p class="check-detail">${check.detail}</p>
      </div>
    </article>
  `).join("");
}

function renderAll() {
  renderQuantityGrid();
  renderRecommendation();
  renderTable();
  renderChecks();
}

function showValidation(errors) {
  els.validationBanner.hidden = errors.length === 0;
  els.validationBanner.textContent = errors.length ? errors[0] : "";
}

function handleModelInput(event) {
  const input = event.target;
  const tierIndex = Number(input.dataset.tier);
  const candidate = cloneTiers(tiers);

  if (input.classList.contains("min-input")) {
    candidate[tierIndex].min = Math.floor(Number(input.value));
  } else if (input.classList.contains("price-input")) {
    candidate[tierIndex].prices[input.dataset.product] = Number(input.value);
  } else {
    return;
  }

  const errors = validateTiers(candidate);
  showValidation(errors);
  if (errors.length === 0) {
    tiers = candidate;
    saveTiers();
    renderRecommendation();
    renderChecks();
  }
}

els.quantityGrid.addEventListener("input", event => {
  const input = event.target.closest("[data-quantity]");
  if (!input) return;
  quantities[input.dataset.quantity] = Math.max(0, Math.floor(Number(input.value) || 0));
  renderRecommendation();
  renderTable();
});

els.quantityGrid.addEventListener("change", event => {
  const input = event.target.closest("[data-quantity]");
  if (!input) return;
  const entered = Math.max(0, Math.floor(Number(input.value) || 0));
  const normalized = normalizePackQuantity(entered, Number(input.dataset.step));
  quantities[input.dataset.quantity] = normalized;
  input.value = normalized;
  if (normalized !== entered) showToast(`Antallet er tilpasset til nærmeste pakke: ${integer.format(normalized)}`);
  renderRecommendation();
  renderTable();
});

els.cadenceSelect.addEventListener("change", () => {
  cadenceWeeks = Number(els.cadenceSelect.value);
  renderRecommendation();
  renderTable();
});

els.employeeInput.addEventListener("input", () => {
  employeeCount = Math.max(1, Math.floor(Number(els.employeeInput.value) || 1));
  renderRecommendation();
});

els.employeeInput.addEventListener("change", () => {
  els.employeeInput.value = employeeCount;
});

els.clearMixButton.addEventListener("click", () => {
  quantities = Object.fromEntries(CREDIT_PRODUCTS.map(product => [product.key, 0]));
  renderAll();
});

els.tableBody.addEventListener("input", handleModelInput);

els.editButton.addEventListener("click", () => {
  editing = !editing;
  els.editButton.setAttribute("aria-pressed", String(editing));
  els.editButton.textContent = editing ? "Færdig" : "Justér model";
  showValidation([]);
  renderTable();
});

els.resetButton.addEventListener("click", () => {
  tiers = cloneTiers(DEFAULT_TIERS);
  saveTiers();
  showValidation([]);
  renderAll();
  showToast("Prisgrupperne er nulstillet");
});

els.quoteButton.addEventListener("click", openQuote);

els.quoteModal.addEventListener("click", event => {
  if (event.target.closest("[data-close-quote]")) closeQuote();
});

[els.quoteCompany, els.quoteContact, els.quotePostalCode, els.quoteValidUntil, els.quoteBibPrice, els.quoteNumber, els.quoteComment].forEach(input => {
  input.addEventListener("input", renderQuote);
});

els.copyQuoteButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(quoteAsText());
    showToast("Pristilbuddet er kopieret");
  } catch {
    showToast("Kunne ikke kopiere tilbuddet automatisk");
  }
});

els.downloadQuoteButton.addEventListener("click", downloadQuote);

els.printQuoteButton.addEventListener("click", () => {
  renderQuote();
  document.body.classList.add("printing-quote");
  window.print();
});

window.addEventListener("afterprint", () => document.body.classList.remove("printing-quote"));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !els.quoteModal.hidden) closeQuote();
});

els.copyButton.addEventListener("click", async () => {
  const { tier, index, volume } = getTier(tiers, normalizedVolume());
  const lines = [
    `Frankly B2B prisgruppe: ${tier.name}`,
    `Antal medarbejdere: ${integer.format(employeeCount)}`,
    `Leveringsfrekvens: hver ${cadenceWeeks === 1 ? "uge" : `${cadenceWeeks}. uge`}`,
    `Credits pr. levering: ${credits.format(calculateCredits(quantities))}`,
    `Ugentlig volumen: ${credits.format(volume)} credits`,
    `Gruppegrænse: ${formatRange(tiers, index)} credits`,
    "Produktmix pr. levering:",
    ...CREDIT_PRODUCTS.filter(product => quantities[product.key] > 0).map(product => `- ${product.label}: ${integer.format(quantities[product.key])} stk. × ${credits.format(product.weight)} credit`),
    "Priser:",
    ...PRODUCTS.map(product => `${product.label}: ${currency.format(tier.prices[product.key])} DKK/stk. ekskl. moms`),
  ];
  const employee = calculateEmployeeMetrics(quantities, tier, cadenceWeeks, employeeCount);
  lines.push(
    `Enheder pr. medarbejder pr. uge: ${credits.format(employee.unitsPerEmployeeWeekly)}`,
    `Pris pr. medarbejder pr. uge: ${currency.format(employee.pricePerEmployeeWeekly)} DKK ekskl. moms`,
  );
  const trade = calculateUpgradeTrade(tiers, quantities, cadenceWeeks);
  if (trade.available) {
    lines.push(
      `Netto trade til ${trade.nextTier.name}:`,
      `- Tabt omsætning på bedre pris: -${currency.format(trade.discountCostWeekly)} DKK/uge`,
      `- Omsætning fra ekstra volumen: +${currency.format(trade.addedRevenueWeekly)} DKK/uge`,
      `- Nettoeffekt: ${signedMoney(trade.netTradeWeekly)}/uge (${signedMoney(trade.netTradeAnnual)}/år)`,
    );
  }
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    showToast("Prisoversigten er kopieret");
  } catch {
    showToast("Kunne ikke kopiere automatisk");
  }
});

renderAll();
