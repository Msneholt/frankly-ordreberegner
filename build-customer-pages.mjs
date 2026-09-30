import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import {
  CUSTOMER_PRODUCTS,
  CUSTOMER_PRODUCTS_COMPLETE,
  CUSTOMER_PRODUCTS_WITH_BIB_CITRUS,
  CUSTOMER_PRODUCTS_WITH_750,
  DEFAULT_TIERS,
  RESELLER_PRODUCTS,
  RESELLER_TIERS,
  calculateNextPriceGap,
  customerProductPrice,
  deliveryBreakdownForPostalCode,
} from "./pricing.mjs";

const appSource = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const functionStart = appSource.indexOf("async function downloadCustomerVersion");
const customerSource = appSource.slice(functionStart);
const templateMatch = customerSource.match(/let html = `([\s\S]*?)`;\n\n  if \(isEnglish\)/);

if (!templateMatch) throw new Error("Kundeversionens HTML-template kunne ikke findes.");

const labelsStart = appSource.indexOf("const CUSTOMER_PRODUCT_LABELS_EN");
const translationSource = appSource.slice(labelsStart, functionStart);
const translationContext = {};
vm.createContext(translationContext);
vm.runInContext(
  `${translationSource}\nthis.labels = CUSTOMER_PRODUCT_LABELS_EN; this.translate = translateCustomerVersionToEnglish;`,
  translationContext,
);

const render = new Function(
  "logoMarkup",
  "tiersJson",
  "productsJson",
  "deliveryBreakdownFunction",
  "nextPriceGapFunction",
  "customerProductPriceFunction",
  `return \`${templateMatch[1]}\`;`,
);

const logo = readFileSync(new URL("./assets/frankly-logo-transparent.png", import.meta.url)).toString("base64");
const logoMarkup = `<img class="brand-logo" src="data:image/png;base64,${logo}" alt="Frankly">`;
function customerPage(language, productList = CUSTOMER_PRODUCTS, tierList = DEFAULT_TIERS, mode = "customer") {
  const isEnglish = language === "en";
  const tiersJson = JSON.stringify(tierList.map(tier => ({ name: tier.name, min: tier.min, prices: tier.prices })));
  const products = productList.map(product => ({
    ...product,
    label: isEnglish ? translationContext.labels[product.key] || product.label : product.label,
    priced: Boolean(product.priceKey) || Number.isFinite(Number(product.fixedPrice)),
  }));
  const html = render(
    logoMarkup,
    tiersJson,
    JSON.stringify(products),
    deliveryBreakdownForPostalCode.toString(),
    calculateNextPriceGap.toString(),
    customerProductPrice.toString(),
  );
  let page = isEnglish ? translationContext.translate(html) : html;
  if (mode === "reseller") {
    page = isEnglish
      ? page
          .replaceAll("Frankly · Order Calculator", "Frankly · Reseller Calculator")
          .replaceAll("Build your order", "Build your reseller order")
      : page
          .replaceAll("Frankly · Ordreberegner", "Frankly · Forhandlerberegner")
          .replaceAll("Sammensæt jeres løsning", "Sammensæt jeres forhandlerordre");
  }
  return page;
}

mkdirSync("dist/ordreberegner", { recursive: true });
mkdirSync("dist/order-calculator", { recursive: true });
mkdirSync("dist/ordreberegner-750ml", { recursive: true });
mkdirSync("dist/order-calculator-750ml", { recursive: true });
mkdirSync("dist/ordreberegner-komplet", { recursive: true });
mkdirSync("dist/order-calculator-complete", { recursive: true });
mkdirSync("dist/ordreberegner-bib-citrus", { recursive: true });
mkdirSync("dist/order-calculator-bib-citrus", { recursive: true });
mkdirSync("dist/ordreberegner-forhandlere", { recursive: true });
mkdirSync("dist/reseller-calculator", { recursive: true });
mkdirSync("dist/assets", { recursive: true });
for (const file of ["index.html", "app.js", "pricing.mjs", "styles.css"]) {
  copyFileSync(file, `dist/${file}`);
}
for (const file of ["frankly-logo-transparent.png", "frankly-logo.png"]) {
  copyFileSync(`assets/${file}`, `dist/assets/${file}`);
}
writeFileSync("dist/ordreberegner/index.html", customerPage("da"));
writeFileSync("dist/order-calculator/index.html", customerPage("en"));
writeFileSync("dist/ordreberegner-750ml/index.html", customerPage("da", CUSTOMER_PRODUCTS_WITH_750));
writeFileSync("dist/order-calculator-750ml/index.html", customerPage("en", CUSTOMER_PRODUCTS_WITH_750));
writeFileSync("dist/ordreberegner-komplet/index.html", customerPage("da", CUSTOMER_PRODUCTS_COMPLETE));
writeFileSync("dist/order-calculator-complete/index.html", customerPage("en", CUSTOMER_PRODUCTS_COMPLETE));
writeFileSync("dist/ordreberegner-bib-citrus/index.html", customerPage("da", CUSTOMER_PRODUCTS_WITH_BIB_CITRUS));
writeFileSync("dist/order-calculator-bib-citrus/index.html", customerPage("en", CUSTOMER_PRODUCTS_WITH_BIB_CITRUS));
writeFileSync("dist/ordreberegner-forhandlere/index.html", customerPage("da", RESELLER_PRODUCTS, RESELLER_TIERS, "reseller"));
writeFileSync("dist/reseller-calculator/index.html", customerPage("en", RESELLER_PRODUCTS, RESELLER_TIERS, "reseller"));
writeFileSync("dist/.nojekyll", "");

console.log("Customer calculator pages generated.");
