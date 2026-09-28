import assert from "node:assert/strict";
import { DEFAULT_TIERS, calculateCredits, calculateEmployeeMetrics, calculatePricedRevenue, calculateQuoteTotals, calculateUpgradeTrade, calculateWeeklyCredits, cloneTiers, formatRange, getTier, normalizePackQuantity, runModelChecks, validateTiers } from "./pricing.mjs";

const tiers = cloneTiers();

assert.equal(validateTiers(tiers).length, 0, "default model should be valid");
assert.equal(getTier(tiers, 18).tier.name, "Standard");
assert.equal(getTier(tiers, 18).tier.prices.juice250, 16);
assert.equal(getTier(tiers, 18).tier.prices.shot60, 8);
assert.equal(getTier(tiers, 700).tier.name, "Key Account");
assert.equal(getTier(tiers, 700).tier.prices.juice250, 12.75);
assert.equal(getTier(tiers, 700).tier.prices.shot60, 7);
assert.equal(getTier(tiers, 249).tier.name, "Plus");
assert.equal(getTier(tiers, 250).tier.name, "Premium");
assert.equal(getTier(tiers, 449).tier.name, "Premium");
assert.equal(getTier(tiers, 450).tier.name, "Key Account");
assert.equal(formatRange(tiers, 0), "0–49");
assert.equal(formatRange(tiers, 4), "450+");
assert.ok(getTier(tiers, 300).tier.prices.juice250 > getTier(tiers, 700).tier.prices.juice250);
assert.deepEqual(tiers.map(tier => ({ name: tier.name, min: tier.min, prices: tier.prices })), [
  { name: "Standard", min: 0, prices: { juice250: 16, shot60: 8, energy340: 13, smoothie250: 17, juice750: 26 } },
  { name: "Select", min: 50, prices: { juice250: 14.5, shot60: 7.75, energy340: 12.75, smoothie250: 15.25, juice750: 25.5 } },
  { name: "Plus", min: 125, prices: { juice250: 13.75, shot60: 7.5, energy340: 12.5, smoothie250: 14.5, juice750: 25 } },
  { name: "Premium", min: 250, prices: { juice250: 13.25, shot60: 7.25, energy340: 12, smoothie250: 13.75, juice750: 24.5 } },
  { name: "Key Account", min: 450, prices: { juice250: 12.75, shot60: 7, energy340: 11.5, smoothie250: 13, juice750: 23.75 } },
]);
assert.ok(runModelChecks(tiers).every(check => check.ok), "all displayed checks should pass");
assert.equal(calculateCredits({ juice250: 18 }), 18);
assert.equal(calculateCredits({ shot60: 600 }), 300);
assert.equal(calculateCredits({ juice750: 25 }), 50);
assert.equal(calculateCredits({ bib5000: 25 }), 250);
assert.equal(calculateCredits({ juice250: 100, shot60: 100, juice750: 10, bib5000: 3 }), 200);
assert.equal(getTier(tiers, calculateCredits({ shot60: 499 })).tier.name, "Plus");
assert.equal(getTier(tiers, calculateCredits({ shot60: 500 })).tier.name, "Premium");
assert.equal(calculateWeeklyCredits({ juice250: 300 }, 1), 300);
assert.equal(calculateWeeklyCredits({ juice250: 300 }, 2), 150);
assert.equal(calculateWeeklyCredits({ juice250: 300 }, 3), 100);
assert.equal(calculateWeeklyCredits({ juice250: 300 }, 4), 75);
assert.equal(getTier(tiers, calculateWeeklyCredits({ juice250: 300 }, 2)).tier.name, "Plus");
assert.equal(normalizePackQuantity(7, 6), 6);
assert.equal(normalizePackQuantity(10, 6), 12);
assert.equal(normalizePackQuantity(13, 12), 12);
assert.equal(normalizePackQuantity(19, 12), 24);

const xlUpgrade = calculateUpgradeTrade(tiers, { juice250: 300 }, 1);
assert.equal(xlUpgrade.available, true);
assert.equal(xlUpgrade.current.tier.name, "Premium");
assert.equal(xlUpgrade.nextTier.name, "Key Account");
assert.equal(xlUpgrade.upgradedQuantities.juice250, 450);
assert.equal(xlUpgrade.discountCostWeekly, 150);
assert.equal(xlUpgrade.addedRevenueWeekly, 1912.5);
assert.equal(xlUpgrade.netTradeWeekly, 1762.5);
assert.equal(xlUpgrade.netTradeAnnual, 91650);

const nearBoundary = calculateUpgradeTrade(tiers, { juice250: 444 }, 1);
assert.equal(nearBoundary.upgradedQuantities.juice250, 450);
assert.equal(nearBoundary.discountCostWeekly, 222);
assert.equal(nearBoundary.addedRevenueWeekly, 76.5);
assert.equal(nearBoundary.netTradeWeekly, -145.5);

const biweekly = calculateUpgradeTrade(tiers, { juice250: 888 }, 2);
assert.equal(biweekly.currentWeeklyCredits, 444);
assert.equal(biweekly.upgradedQuantities.juice250, 900);
assert.equal(biweekly.netTradeWeekly, -145.5);
assert.equal(calculatePricedRevenue({ juice250: 300 }, tiers[3], 1), 3975);

const employeeExample = calculateEmployeeMetrics({ juice250: 20, shot60: 10 }, tiers[0], 1, 10);
assert.equal(employeeExample.unitsPerDelivery, 30);
assert.equal(employeeExample.unitsPerEmployeeWeekly, 3);
assert.equal(employeeExample.pricePerEmployeeWeekly, 40);

const employeeBiweekly = calculateEmployeeMetrics({ juice250: 20, shot60: 10 }, tiers[0], 2, 10);
assert.equal(employeeBiweekly.unitsPerEmployeeWeekly, 1.5);
assert.equal(employeeBiweekly.pricePerEmployeeWeekly, 20);

const quoteExample = calculateQuoteTotals({ juice250: 20, shot60: 10 }, tiers[0], 1, 99);
assert.equal(quoteExample.productSubtotalDelivery, 400);
assert.equal(quoteExample.totalExVatDelivery, 499);
assert.equal(quoteExample.vatDelivery, 124.75);
assert.equal(quoteExample.totalInclVatDelivery, 623.75);
assert.equal(quoteExample.totalExVatWeekly, 499);

const quoteBiweekly = calculateQuoteTotals({ juice250: 20, shot60: 10 }, tiers[0], 2, 99);
assert.equal(quoteBiweekly.totalExVatWeekly, 249.5);

const quoteBibMissing = calculateQuoteTotals({ bib5000: 6 }, tiers[0], 1, 99);
assert.equal(quoteBibMissing.bibPriceMissing, true);
const quoteBibPriced = calculateQuoteTotals({ bib5000: 6 }, tiers[0], 1, 99, 138.5);
assert.equal(quoteBibPriced.bibSubtotalDelivery, 831);
assert.equal(quoteBibPriced.totalExVatDelivery, 930);

const invalidBoundary = cloneTiers();
invalidBoundary[2].min = invalidBoundary[1].min;
assert.ok(validateTiers(invalidBoundary).length > 0, "duplicate boundary should fail");

const invalidPrice = cloneTiers();
invalidPrice[3].prices.energy340 = invalidPrice[2].prices.energy340 + 1;
assert.ok(validateTiers(invalidPrice).length > 0, "price increase at higher volume should fail");

assert.deepEqual(DEFAULT_TIERS, cloneTiers(DEFAULT_TIERS), "clone should preserve defaults");

console.log("Pricing model and credit weights: all assertions passed.");
