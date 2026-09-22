import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import {
  CUSTOMER_PRODUCTS,
  DEFAULT_TIERS,
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
const tiersJson = JSON.stringify(DEFAULT_TIERS.map(tier => ({ name: tier.name, min: tier.min, prices: tier.prices })));

function customerPage(language) {
  const isEnglish = language === "en";
  const products = CUSTOMER_PRODUCTS.map(product => ({
    ...product,
    label: isEnglish ? translationContext.labels[product.key] || product.label : product.label,
    priced: Boolean(product.priceKey),
  }));
  const html = render(
    logoMarkup,
    tiersJson,
    JSON.stringify(products),
    deliveryBreakdownForPostalCode.toString(),
    calculateNextPriceGap.toString(),
    customerProductPrice.toString(),
  );
  return isEnglish ? translationContext.translate(html) : html;
}

mkdirSync("dist/ordreberegner", { recursive: true });
mkdirSync("dist/order-calculator", { recursive: true });
mkdirSync("dist/assets", { recursive: true });
for (const file of ["index.html", "app.js", "pricing.mjs", "styles.css"]) {
  copyFileSync(file, `dist/${file}`);
}
for (const file of ["frankly-logo-transparent.png", "frankly-logo.png"]) {
  copyFileSync(`assets/${file}`, `dist/assets/${file}`);
}
writeFileSync("dist/ordreberegner/index.html", customerPage("da"));
writeFileSync("dist/order-calculator/index.html", customerPage("en"));
writeFileSync("dist/.nojekyll", "");

console.log("Customer calculator pages generated.");
