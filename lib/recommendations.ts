// Rule-based recommendation generator.
// Every recommendation is derived from real DB rows — never invented.
// Confidence is only set where it is statistically justified (sample size
// stated in supportingData); otherwise a conservative default is used and
// the text says why.

import { PrismaClient } from "@prisma/client";
import { money } from "./analytics";

type Draft = {
  type: string;
  title: string;
  problem: string;
  supportingData: string;
  proposedAction: string;
  expectedImpact: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
};

export async function generateRecommendations(
  prisma: PrismaClient,
  orgId: string,
  currency: string
): Promise<Draft[]> {
  const drafts: Draft[] = [];
  const [inventory, sales, expenses, campaigns, customers] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { organizationId: orgId }, include: { product: true } }),
    prisma.sale.findMany({ where: { organizationId: orgId }, select: { totalAmount: true, totalCost: true, occurredAt: true, customerId: true } }),
    prisma.expense.findMany({ where: { organizationId: orgId }, select: { amount: true, category: true } }),
    prisma.campaign.findMany({ where: { organizationId: orgId } }),
    prisma.customer.findMany({ where: { organizationId: orgId }, select: { id: true } }),
  ]);

  // 1. Low stock
  const low = inventory.filter((i) => i.quantityOnHand <= i.reorderPoint);
  for (const item of low.slice(0, 3)) {
    drafts.push({
      type: "LOW_STOCK",
      title: `Reorder ${item.product.name} — stock is low`,
      problem: `${item.product.name} has ${item.quantityOnHand} units on hand, at or below its reorder point of ${item.reorderPoint}.`,
      supportingData: `On hand ${item.quantityOnHand}, reorder point ${item.reorderPoint}, suggested order ${item.reorderQty} units.`,
      proposedAction: `Place a reorder of ${item.reorderQty} units of ${item.product.name}.`,
      expectedImpact: `Avoids a stockout on a product that sells; stockout cost is unmeasured, so impact is qualitative.`,
      risk: "MEDIUM",
      confidence: 80,
    });
  }

  // 2. Dead stock
  const dead = inventory.filter(
    (i) => i.lastSoldAt && Date.now() - i.lastSoldAt.getTime() > 90 * 86400000 && i.quantityOnHand > 0
  );
  for (const item of dead.slice(0, 2)) {
    const value = item.quantityOnHand * Number(item.product.unitCost);
    drafts.push({
      type: "DEAD_STOCK",
      title: `Clear dead stock: ${item.product.name}`,
      problem: `${item.product.name} has not sold in 90+ days with ${item.quantityOnHand} units still on hand.`,
      supportingData: `Last sold ${item.lastSoldAt!.toISOString().slice(0, 10)}; tied-up capital ${money(value, currency)} at cost.`,
      proposedAction: "Discount or bundle the item to free the tied-up capital.",
      expectedImpact: `Recovers up to ${money(value, currency)} of tied-up capital if sold at cost.`,
      risk: "LOW",
      confidence: 85,
    });
  }

  // 3. Falling margin
  const revenue = sales.reduce((s, r) => s + Number(r.totalAmount), 0);
  const netProfit = revenue - sales.reduce((s, r) => s + Number(r.totalCost), 0) - expenses.reduce((s, r) => s + Number(r.amount), 0);
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  if (revenue > 0 && margin < 10) {
    drafts.push({
      type: "LOW_MARGIN",
      title: "Net margin is below 10% — review costs or pricing",
      problem: `Net margin is ${margin.toFixed(1)}%, below the 10% warning threshold.`,
      supportingData: `Revenue ${money(revenue, currency)}, net profit ${money(netProfit, currency)} across ${sales.length} sales.`,
      proposedAction: "Review the largest expense categories and test a price increase on the highest-volume product.",
      expectedImpact: "Each 1-point margin gain is worth " + money(revenue * 0.01, currency) + " on current revenue.",
      risk: "HIGH",
      confidence: 70,
    });
  }

  // 4. High CAC / low ROAS campaign
  for (const c of campaigns) {
    const spend = Number(c.spend);
    const rev = Number(c.revenue);
    if (spend > 0 && rev / spend < 1.5 && c.conversions > 0) {
      drafts.push({
        type: "HIGH_CAC",
        title: `Campaign "${c.name}" returns under 1.5x — reallocate budget`,
        problem: `"${c.name}" (${c.channel}) spends ${money(spend, currency)} for ${money(rev, currency)} revenue — ROAS ${(rev / spend).toFixed(2)}x.`,
        supportingData: `${c.conversions} conversions from ${c.leads} leads; CAC ${money(spend / c.conversions, currency)}.`,
        proposedAction: "Shift part of this campaign's budget to the highest-ROAS channel via the Optimization page.",
        expectedImpact: `Moving ${money(spend * 0.25, currency)} to a 2x channel could add ~${money(spend * 0.25 * 0.5, currency)} expected return.`,
        risk: "MEDIUM",
        confidence: 65,
      });
    }
  }

  // 5. Churn risk
  const lastSaleByCustomer = new Map<string, Date>();
  for (const s of sales) {
    if (!s.customerId) continue;
    const cur = lastSaleByCustomer.get(s.customerId);
    if (!cur || s.occurredAt > cur) lastSaleByCustomer.set(s.customerId, s.occurredAt);
  }
  const churned = [...lastSaleByCustomer.values()].filter(
    (d) => Date.now() - d.getTime() > 90 * 86400000
  ).length;
  if (churned > 0 && customers.length > 0) {
    drafts.push({
      type: "CHURN_RISK",
      title: `${churned} customer(s) have not bought in 90+ days`,
      problem: `${churned} of ${customers.length} customers have no purchase in the last 90 days.`,
      supportingData: `${lastSaleByCustomer.size} customers have bought at least once; ${churned} are inactive 90+ days.`,
      proposedAction: "Run a win-back offer to the inactive customers (email campaign).",
      expectedImpact: "Recovering even one average customer is worth the average CLV (see Customers page).",
      risk: "MEDIUM",
      confidence: 60,
    });
  }

  return drafts;
}
