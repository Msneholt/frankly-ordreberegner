import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { CREDIT_PRODUCTS, CUSTOMER_PRODUCTS, DEFAULT_TIERS, calculateEmployeeMetrics, calculateNextPriceGap, customerProductPrice, deliveryBreakdownForPostalCode, deliveryFeeForPostalCode, getTier } from "./pricing.mjs";

function buildCustomerHtml(products = CUSTOMER_PRODUCTS) {
  const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const functionStart = source.indexOf("async function downloadCustomerVersion");
  assert.notEqual(functionStart, -1, "Kundeversionens generator skal findes");
  const customerSource = source.slice(functionStart);
  const template = customerSource.match(/let html = `([\s\S]*?)`;\n\n  if \(isEnglish\)/);
  assert.ok(template, "Kundeversionens HTML-template skal kunne udtrækkes");

  const render = new Function("logoMarkup", "tiersJson", "productsJson", "deliveryBreakdownFunction", "nextPriceGapFunction", "customerProductPriceFunction", `return \`${template[1]}\`;`);
  const customerTiers = DEFAULT_TIERS.map(tier => ({ name: tier.name, min: tier.min, prices: tier.prices }));
  const customerProducts = products.map(product => ({ ...product, priced: Boolean(product.priceKey) }));
  return render(
    '<span class="logo-word">FRANKLY</span>',
    JSON.stringify(customerTiers),
    JSON.stringify(customerProducts),
    deliveryBreakdownForPostalCode.toString(),
    calculateNextPriceGap.toString(),
    customerProductPrice.toString(),
  );
}

function buildEnglishCustomerHtml() {
  const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const start = source.indexOf("const CUSTOMER_PRODUCT_LABELS_EN");
  const end = source.indexOf("async function downloadCustomerVersion");
  assert.notEqual(start, -1, "Engelske produktnavne skal findes");
  assert.notEqual(end, -1, "Den tosprogede generator skal findes");
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source.slice(start, end)}\nthis.labels = CUSTOMER_PRODUCT_LABELS_EN; this.translate = translateCustomerVersionToEnglish;`, context);
  const products = CUSTOMER_PRODUCTS.map(product => ({ ...product, label: context.labels[product.key] || product.label }));
  return context.translate(buildCustomerHtml(products));
}

test("kundeversionen er selvstændig, enkel og uden interne begreber i visningen", () => {
  const html = buildCustomerHtml();
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script, "Kundeversionen skal indeholde sin egen beregner");
  assert.doesNotThrow(() => new vm.Script(script[1], { filename: "customer-inline.js" }), "Den indlejrede beregner skal være gyldig JavaScript");

  const visibleMarkup = html
    .replace(/<script>[\s\S]*?<\/script>/g, "")
    .replace(/<style>[\s\S]*?<\/style>/g, "");
  assert.doesNotMatch(visibleMarkup, /credits|netto trade|modelkontrol|gruppegrænse/i);
  assert.match(visibleMarkup, /Prisgruppe · Standard/);
  assert.match(visibleMarkup, /Antal medarbejdere/);
  assert.match(visibleMarkup, /id="employeesNotApplicable"/);
  assert.match(visibleMarkup, /Ikke relevant/);
  assert.match(visibleMarkup, /<option value="once">Éngangsbestilling<\/option>/);
  assert.match(visibleMarkup, /Postnr\./);
  assert.match(visibleMarkup, /id="cvr"/);
  assert.match(visibleMarkup, /id="invoiceEmail"/);
  assert.match(visibleMarkup, /id="phone"/);
  assert.match(visibleMarkup, /id="deliveryAddress"/);
  assert.match(visibleMarkup, /Faktureringsmail/);
  assert.match(visibleMarkup, /Telefonnr\./);
  assert.match(visibleMarkup, /Leveringsadresse/);
  for (const fieldId of ["company", "cvr", "invoiceEmail", "postalCode", "deliveryAddress", "contact", "phone"]) {
    assert.match(visibleMarkup, new RegExp(`id="${fieldId}"[^>]*placeholder="\\.\\.\\."`));
  }
  assert.doesNotMatch(visibleMarkup, /placeholder="(?:XYZ|123)"/);
  assert.doesNotMatch(visibleMarkup, /95 DKK: 1000–2999|145 DKK: 3000–4000|4001–9999/);
  assert.match(visibleMarkup, /Levering/);
  assert.match(visibleMarkup, /Pris pr\. medarbejder \/ uge/);
  assert.match(visibleMarkup, /Produkter pr\. levering/);
  assert.match(visibleMarkup, /id="productTotal">0 stk\./);
  assert.match(visibleMarkup, /Gem dette tilbud og send det til Frankly\./);
  assert.doesNotMatch(visibleMarkup, /Kopiér tilbud/);
  assert.match(visibleMarkup, /Gem tilbud/);
  assert.match(visibleMarkup, /Print \/ Gem som PDF/);
  assert.match(visibleMarkup, /<th>Stykpris<\/th>/);
  assert.doesNotMatch(visibleMarkup, /<th>Stk\.<\/th>/);
  assert.doesNotMatch(visibleMarkup, /Tilbudsnummer|id="offerNumber"/);
  assert.match(visibleMarkup, /<textarea id="customerComment"/);
  assert.match(visibleMarkup, /id="commentPreview"/);
  assert.match(visibleMarkup, /id="cleanQuote"/);
  assert.match(script[1], /productTotal.*unitsDelivery/);
  assert.match(script[1], /oneTime=cadenceValue==="once"/);
  assert.match(script[1], /employeesRelevant=!document\.getElementById\("employeesNotApplicable"\)\.checked/);
  assert.doesNotMatch(script[1], /state\.priceReady&&state\.employeesRelevant&&!state\.oneTime/);
  assert.match(script[1], /state\.employeesRelevant&&!state\.oneTime/);
  assert.match(script[1], /cleanQuoteInvoiceEmail/);
  assert.match(script[1], /cleanQuotePhone/);
  assert.match(script[1], /cleanQuoteDeliveryAddress/);
  assert.match(script[1], /Antal produkter i alt.*state\.unitsDelivery/);
  assert.doesNotMatch(visibleMarkup, /id="cleanQuoteNext"/);
  assert.doesNotMatch(script[1], /cleanQuoteNextText/);
  assert.match(script[1], /employeeMetricsReady/);
  assert.doesNotMatch(script[1], /product\.label\)+' · stk\. pr\. levering/);
  assert.match(script[1], /quantity-unit">stk\./);
  assert.match(script[1], /Pakke á/);
  assert.doesNotMatch(html, /#dff05f|#e9f77f/i);
  assert.match(html, /\.result-card\{color:var\(--ink\);background:var\(--paper\)\}/);
  assert.match(html, /\.metric,\.metric:first-child\{border-color:var\(--line\);background:var\(--green-soft\)\}/);
  assert.doesNotMatch(visibleMarkup, /Løsning til jeres arbejdsplads|Prisen opdateres automatisk/i);
  assert.match(script[1], /extraProducts/);
  assert.match(script[1], /Bestil .*produkter yderligere og få en lavere pris pr\. produkt/);
  assert.doesNotMatch(visibleMarkup, /Næste prisgruppe/);
  assert.match(script[1], /EUR-palle/);
  assert.match(script[1], /Levering i alt/);
  assert.match(script[1], /"Kommentar:"/);
  assert.doesNotMatch(script[1], /cleanQuoteOfferNumber|offerNumber/);
  assert.match(script[1], /Det rene pristilbud er gemt/);
  assert.match(script[1], /250 ml spinat/);
  assert.match(script[1], /250 ml appelsin/);
  assert.match(script[1], /250 ml avocado smoothie/);
  assert.match(script[1], /250 ml jordbær smoothie/);
  assert.match(script[1], /250 ml mango smoothie/);
  assert.match(script[1], /60 ml ingefær shot/);
  assert.match(script[1], /60 ml gurkemeje\/chili shot/);
  assert.match(script[1], /340 ml passion energi/);
  assert.match(script[1], /340 ml lime\/citron energi/);
  assert.match(script[1], /productGroupLabels=\{juice250:"250 ml juice ØKO",smoothie250:"250 ml smoothie ØKO",shot60:"60 ml shot ØKO",energy340:"340 ml energi ØKO"\}/);
  assert.match(script[1], /class="product-group-title"/);
  assert.match(html, /\.product-group-title\{grid-column:1\/-1;margin:15px 0 1px/);
  assert.doesNotMatch(html, /750 ml juice|5 L BiB/);
  assert.match(html, /<title>Frankly · Ordreberegner<\/title>/);
});

test("kundeversionerne har selvstændige offentlige adresser på dansk og engelsk", () => {
  const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const danishPage = readFileSync(new URL("./dist/ordreberegner/index.html", import.meta.url), "utf8");
  const englishPage = readFileSync(new URL("./dist/order-calculator/index.html", import.meta.url), "utf8");

  assert.match(index, /id="customerVersionButtonDa"[^>]*href="\.\/ordreberegner\/"[^>]*>Ordreberegner<\/a>/);
  assert.match(index, /id="customerVersionButtonEn"[^>]*href="\.\/order-calculator\/"[^>]*>Order Calculator<\/a>/);
  assert.doesNotMatch(app, /customerVersionButtonDa\.addEventListener/);
  assert.doesNotMatch(app, /customerVersionButtonEn\.addEventListener/);
  assert.match(danishPage, /<title>Frankly · Ordreberegner<\/title>/);
  assert.match(danishPage, /Éngangsbestilling/);
  assert.match(englishPage, /<title>Frankly · Order Calculator<\/title>/);
  assert.match(englishPage, /One-time order/);
  assert.match(englishPage, /Save this quote and send it to Frankly\./);
});

test("den engelske Order Calculator er gennemgående oversat og har gyldig JavaScript", () => {
  const html = buildEnglishCustomerHtml();
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script[1], { filename: "order-calculator-inline.js" }));
  assert.match(html, /<html lang="en">/);
  assert.match(html, /Frankly · Order Calculator/);
  assert.match(html, /Build your order/);
  assert.match(html, /Invoice email/);
  assert.match(html, /Phone number/);
  assert.match(html, /Delivery address/);
  assert.match(html, /Postal code/);
  assert.match(html, /CVR/);
  assert.match(html, /Price group · Standard/);
  assert.match(html, /Save this quote and send it to Frankly\./);
  assert.doesNotMatch(html, /Copy quote/);
  assert.match(html, /Unit price/);
  assert.doesNotMatch(html, /Stykpris/);
  assert.match(html, /Order .*additional products and get a lower price per product/);
  assert.match(html, /<option value="once">One-time order<\/option>/);
  assert.match(html, /Not applicable/);
  assert.doesNotMatch(html, /Quote number|id="offerNumber"/);
  assert.doesNotMatch(html, /placeholder="(?:XYZ|123)"/);
  assert.match(html, /250 ml spinach/);
  assert.match(html, /340 ml lime\/lemon energy/);
  assert.match(html, /250 ml organic juice/);
  assert.match(html, /250 ml organic smoothie/);
  assert.match(html, /60 ml organic shot/);
  assert.match(html, /340 ml organic energy/);
  assert.doesNotMatch(html, /ØKO/);
  assert.doesNotMatch(html, /Free from DKK 2,250|4001–9999: DKK 595/);
  assert.match(html, /Total delivery/);
  assert.match(html, /Total number of products/);
  assert.doesNotMatch(html, /products i alt/);
  assert.match(html, /EUR pallet/);
  assert.doesNotMatch(html, /Sammensæt|Jeres behov|Prisgruppe|Leveringsfrekvens|Kopiér|Tilbudsnummer|Postnummer|Éngangsbestilling|Ikke relevant|bestillingen/);
});

test("virksomhedsoplysninger står før Jeres behov, som står over alle produkter", () => {
  const html = buildCustomerHtml();
  const companyField = html.indexOf('id="company"');
  const cvrField = html.indexOf('id="cvr"');
  const invoiceEmailField = html.indexOf('id="invoiceEmail"');
  const postalCodeField = html.indexOf('id="postalCode"');
  const deliveryAddressField = html.indexOf('id="deliveryAddress"');
  const contactField = html.indexOf('id="contact"');
  const phoneField = html.indexOf('id="phone"');
  const needsHeading = html.indexOf('id="form-title"');
  const productGrid = html.indexOf('id="productGrid"');
  assert.ok(companyField !== -1 && companyField < needsHeading);
  assert.match(html, /class="field field-wide"[^>]*><span>Virksomhed/);
  assert.ok(companyField < cvrField && cvrField < invoiceEmailField);
  assert.ok(invoiceEmailField < postalCodeField && postalCodeField < deliveryAddressField);
  assert.ok(deliveryAddressField < contactField && contactField < phoneField);
  assert.ok(phoneField < needsHeading);
  assert.ok(needsHeading < productGrid);
  assert.doesNotMatch(html, /firstProductGrid|remainingProductGrid/);
});

test("kundeversionen indeholder kun de 13 aftalte SKU'er", () => {
  assert.equal(CUSTOMER_PRODUCTS.length, 13);
  assert.equal(CUSTOMER_PRODUCTS.filter(product => product.priceKey === "juice250").length, 6);
  assert.equal(CUSTOMER_PRODUCTS.filter(product => product.priceKey === "smoothie250").length, 3);
  assert.equal(CUSTOMER_PRODUCTS.filter(product => product.priceKey === "shot60").length, 2);
  assert.equal(CUSTOMER_PRODUCTS.filter(product => product.priceKey === "energy340").length, 2);
  assert.equal(CUSTOMER_PRODUCTS.some(product => product.priceKey === "juice750" || product.key === "bib5000"), false);
  assert.equal(CUSTOMER_PRODUCTS.filter(product => product.priceKey === "juice250").every(product => product.label.endsWith(" juice")), true);
});

test("kundeversionen beregner 250 ml-varianternes pristillæg korrekt", () => {
  const standard = DEFAULT_TIERS[0];
  const premium = DEFAULT_TIERS[3];
  const product = key => CUSTOMER_PRODUCTS.find(item => item.key === key);

  assert.equal(customerProductPrice(product("juice250_beetroot"), standard), 16);
  assert.equal(customerProductPrice(product("juice250_carrot"), standard), 16);
  assert.equal(customerProductPrice(product("juice250_strawberry"), standard), 16);
  assert.equal(customerProductPrice(product("juice250_apple"), standard), 16);
  assert.equal(customerProductPrice(product("juice250_spinach"), standard), 16.5);
  assert.equal(customerProductPrice(product("juice250_orange"), standard), 16.75);
  assert.equal(customerProductPrice(product("juice250_spinach"), premium), 14.25);
  assert.equal(customerProductPrice(product("juice250_orange"), premium), 14.5);
});

test("pristilbuddet viser og eksporterer den tilknyttede kommentar", () => {
  const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(index, /<textarea id="quoteComment"/);
  assert.match(app, /quoteComment: document\.querySelector/);
  assert.match(app, /data\.comment \? `<div class="quote-comment"/);
  assert.match(app, /"Kommentar:", data\.comment/);
  assert.match(styles, /\.quote-comment/);
});

test("tilbudsnummeret kan overskrives og følger med i eksporten", () => {
  const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");

  assert.match(index, /<input id="quoteNumber" type="text"/);
  assert.match(app, /offerNumber: els\.quoteNumber\.value\.trim\(\) \|\| generatedQuoteNumber/);
  assert.match(app, /escapeHtml\(data\.offerNumber\)/);
  assert.match(app, /data\.offerNumber\.replace/);
});

test("hovedtilbuddet vælger automatisk levering fra postnummer", () => {
  const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");

  assert.match(index, /id="quotePostalCode"/);
  assert.doesNotMatch(index, /id="quoteDeliveryFee"/);
  assert.match(app, /deliveryBreakdownForPostalCode\(postalCode, orderSubtotal\)/);
  assert.match(app, /deliveryFeeKnown/);
  assert.match(app, /freeDelivery/);
  assert.match(app, /EUR-palle/);
  assert.match(app, /Levering i alt/);
});

test("logoet bruger den transparente billedfil i alle tilbudsvisninger", () => {
  const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");

  assert.match(index, /assets\/frankly-logo-transparent\.png/);
  assert.match(app, /assets\/frankly-logo-transparent\.png/);
  assert.doesNotMatch(`${index}\n${app}`, /assets\/frankly-logo\.png/);
});

test("print og PDF reserverer ingen plads til browserens top- og bundtekst", () => {
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(styles, /@page \{ size: A4; margin: 0; \}/);
  assert.match(app, /@page\{size:A4;margin:0\}/);
  assert.doesNotMatch(`${styles}\n${app}`, /@page\s*\{[^}]*margin:\s*12mm/);
});

test("medarbejdereksemplet giver tre fysiske enheder pr. medarbejder", () => {
  const quantities = { juice250: 18, shot60: 12, energy340: 0, smoothie250: 0, juice750: 0, bib5000: 0 };
  const tier = getTier(DEFAULT_TIERS, 24).tier;
  const metrics = calculateEmployeeMetrics(quantities, tier, 1, 10);
  assert.equal(metrics.unitsPerEmployeeWeekly, 3);
});

test("leveringspris følger postnummergrænserne og bliver gratis fra 2.250 DKK", () => {
  assert.equal(deliveryFeeForPostalCode("2999"), 95);
  assert.equal(deliveryFeeForPostalCode("3000"), 145);
  assert.equal(deliveryFeeForPostalCode("4000"), 145);
  assert.equal(deliveryFeeForPostalCode("2999", 2249.99), 95);
  assert.equal(deliveryFeeForPostalCode("3000", 2249.99), 145);
  assert.equal(deliveryFeeForPostalCode("2999", 2250), 0);
  assert.equal(deliveryFeeForPostalCode("3000", 2250), 0);
  assert.equal(deliveryFeeForPostalCode("4000", 3000), 0);
  assert.equal(deliveryFeeForPostalCode("4001"), 730);
  assert.equal(deliveryFeeForPostalCode("4001", 3000), 730);
  assert.equal(deliveryFeeForPostalCode("9999", 3000), 730);
  assert.deepEqual(deliveryBreakdownForPostalCode("4001", 2250), {
    deliveryFee: 595,
    palletFee: 135,
    total: 730,
    free: false,
    remote: true,
  });
  assert.deepEqual(deliveryBreakdownForPostalCode("4000", 2250), {
    deliveryFee: 0,
    palletFee: 0,
    total: 0,
    free: true,
    remote: false,
  });
  assert.equal(deliveryFeeForPostalCode(""), null);
});

test("afstand til næste pris beregnes i fysiske produkter og hele pakker", () => {
  const quantities = { juice250: 498, shot60: 0, energy340: 0, smoothie250: 0, juice750: 0, bib5000: 0 };
  const gap = calculateNextPriceGap(DEFAULT_TIERS, CREDIT_PRODUCTS, quantities, 1);
  assert.equal(gap.available, true);
  assert.equal(gap.extraProducts, 6);
  assert.equal(gap.targetQuantities.juice250, 504);
  assert.equal(gap.currentTierIndex, 3);
  assert.equal(gap.nextTierIndex, 4);

  const topTier = calculateNextPriceGap(DEFAULT_TIERS, CREDIT_PRODUCTS, { ...quantities, juice250: 700 }, 1);
  assert.equal(topTier.available, false);
  assert.equal(topTier.atTop, true);
});

test("SKU-mix tæller hver 250 ml-variant som én credit", () => {
  const quantities = Object.fromEntries(CUSTOMER_PRODUCTS.map(product => [product.key, 0]));
  quantities.juice250_beetroot = 6;
  quantities.juice250_spinach = 6;
  quantities.juice250_orange = 6;
  const gap = calculateNextPriceGap(DEFAULT_TIERS, CUSTOMER_PRODUCTS, quantities, 1);

  assert.equal(gap.currentTierIndex, 0);
  assert.equal(gap.available, true);
  assert.equal(gap.targetQuantities.juice250_beetroot, 18);
  assert.equal(gap.targetQuantities.juice250_spinach, 18);
  assert.equal(gap.targetQuantities.juice250_orange, 18);
});
