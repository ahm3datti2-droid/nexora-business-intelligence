// NEXORA seed — DEMO DATA ONLY.
// Creates ONE demo organization "Nexora Demo Company" with deterministic,
// clearly-labelled demo transactions. This data is NOT real business data:
// the UI shows a "Demo data" badge until the user imports their own data
// or clears the demo dataset (Settings → Data).
//
// Usage:
//   npx prisma db push
//   npm run db:seed

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Deterministic pseudo-random generator (seeded) so the demo dataset is
// identical on every run.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  console.log("==================================================");
  console.log("NEXORA seed — DEMO DATA (not real business data)");
  console.log("==================================================");

  const rand = mulberry32(20261119);
  const org = await prisma.organization.upsert({
    where: { slug: "nexora-demo" },
    update: {},
    create: {
      name: "Nexora Demo Company",
      slug: "nexora-demo",
      plan: "PROFESSIONAL",
      currency: "EGP",
      isDemo: true,
      demoData: true,
    },
  });

  // Demo owner account: demo@nexora.app / demo1234
  const passwordHash = await bcrypt.hash("demo1234", 12);
  await prisma.user.upsert({
    where: { email: "demo@nexora.app" },
    update: {},
    create: {
      email: "demo@nexora.app",
      name: "Demo Owner",
      passwordHash,
      role: Role.ORG_OWNER,
      organizationId: org.id,
    },
  });

  // Clean previous demo rows for this org (idempotent re-seed).
  await prisma.saleItem.deleteMany({ where: { sale: { organizationId: org.id } } });
  await prisma.sale.deleteMany({ where: { organizationId: org.id } });
  await prisma.inventoryItem.deleteMany({ where: { organizationId: org.id } });
  await prisma.product.deleteMany({ where: { organizationId: org.id } });
  await prisma.customer.deleteMany({ where: { organizationId: org.id } });
  await prisma.expense.deleteMany({ where: { organizationId: org.id } });
  await prisma.campaign.deleteMany({ where: { organizationId: org.id } });
  await prisma.recommendation.deleteMany({ where: { organizationId: org.id } });

  const productDefs = [
    { name: "Nexora Analytics Pro", sku: "NX-AN-001", category: "Software", unitPrice: 1200, unitCost: 300 },
    { name: "Nexora Dashboard Suite", sku: "NX-DB-002", category: "Software", unitPrice: 850, unitCost: 220 },
    { name: "Nexora Sensor Kit", sku: "NX-HW-003", category: "Hardware", unitPrice: 2400, unitCost: 1400 },
    { name: "Nexora Consulting Day", sku: "NX-SV-004", category: "Services", unitPrice: 3000, unitCost: 900 },
    { name: "Nexora Training Course", sku: "NX-TR-005", category: "Services", unitPrice: 600, unitCost: 150 },
    { name: "Nexora Mobile Add-on", sku: "NX-MB-006", category: "Software", unitPrice: 450, unitCost: 90 },
  ];
  const products = [];
  for (const def of productDefs) {
    products.push(
      await prisma.product.create({ data: { ...def, organizationId: org.id } })
    );
  }

  const customerNames = [
    "Cairo Retail Group", "Alexandria Foods", "Delta Pharma", "Nile Textiles",
    "Giza Electronics", "Suez Logistics", "Mansoura Furniture", "Tanta Ceramics",
    "Ismailia Trading Co", "Port Said Marine", "Fayoum Agro", "Zagazig Steel",
  ];
  const customers = [];
  for (let i = 0; i < customerNames.length; i++) {
    customers.push(
      await prisma.customer.create({
        data: {
          organizationId: org.id,
          name: customerNames[i],
          email: `contact@${customerNames[i].toLowerCase().replace(/[^a-z]/g, "")}.example`,
          segment: i < 3 ? "VIP" : i < 7 ? "Regular" : "Standard",
          firstSeenAt: new Date(Date.now() - (180 - i * 10) * 86400000),
        },
      })
    );
  }

  // Sales over the last 6 months: ~14 sales/month, growing trend.
  const now = new Date();
  let saleCount = 0;
  for (let m = 5; m >= 0; m--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const salesThisMonth = 10 + (5 - m) * 2 + Math.floor(rand() * 4); // growing
    for (let s = 0; s < salesThisMonth; s++) {
      const day = 1 + Math.floor(rand() * 27);
      const occurredAt = new Date(monthStart.getFullYear(), monthStart.getMonth(), day, 10 + Math.floor(rand() * 8));
      const customer = customers[Math.floor(rand() * customers.length)];
      const itemCount = 1 + Math.floor(rand() * 3);
      const items: { product: (typeof products)[number]; qty: number }[] = [];
      let totalAmount = 0;
      let totalCost = 0;
      const used = new Set<number>();
      for (let k = 0; k < itemCount; k++) {
        let pi = Math.floor(rand() * products.length);
        if (used.has(pi)) pi = (pi + 1) % products.length;
        used.add(pi);
        const qty = 1 + Math.floor(rand() * 4);
        const p = products[pi];
        items.push({ product: p, qty });
        totalAmount += Number(p.unitPrice) * qty;
        totalCost += Number(p.unitCost) * qty;
      }
      saleCount++;
      await prisma.sale.create({
        data: {
          organizationId: org.id,
          customerId: customer.id,
          externalRef: `DEMO-SALE-${String(saleCount).padStart(4, "0")}`,
          totalAmount,
          totalCost,
          occurredAt,
          channel: ["store", "online", "partner"][Math.floor(rand() * 3)],
          items: {
            create: items.map(({ product, qty }) => ({
              productId: product.id,
              quantity: qty,
              unitPrice: product.unitPrice,
              unitCost: product.unitCost,
            })),
          },
        },
      });
    }
  }

  // Inventory (one low-stock and one dead-stock item by design).
  const stockLevels = [42, 8, 120, 0, 65, 3];
  for (let i = 0; i < products.length; i++) {
    await prisma.inventoryItem.create({
      data: {
        organizationId: org.id,
        productId: products[i].id,
        quantityOnHand: stockLevels[i],
        reorderPoint: 10,
        reorderQty: 25,
        lastSoldAt: i === 3 ? new Date(Date.now() - 120 * 86400000) : new Date(Date.now() - Math.floor(rand() * 10) * 86400000),
      },
    });
  }

  // Monthly operating expenses, 6 months.
  const expenseCats = [
    { category: "Rent", amount: 15000 },
    { category: "Salaries", amount: 45000 },
    { category: "Utilities", amount: 6000 },
    { category: "Software", amount: 4000 },
  ];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 5);
    for (const e of expenseCats) {
      await prisma.expense.create({
        data: {
          organizationId: org.id,
          category: e.category,
          description: `Demo ${e.category} — ${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
          amount: e.amount * (0.95 + rand() * 0.1),
          occurredAt: d,
        },
      });
    }
  }

  // Campaigns with realistic ROAS spread.
  const campaignDefs = [
    { name: "Google Search — Brand", channel: "Google Ads", spend: 18000, revenue: 54000, leads: 420, conversions: 96 },
    { name: "Meta — Product Launch", channel: "Meta Ads", spend: 22000, revenue: 41800, leads: 610, conversions: 74 },
    { name: "LinkedIn — B2B Outreach", channel: "LinkedIn", spend: 12000, revenue: 14400, leads: 180, conversions: 21 },
    { name: "Email — Retention", channel: "Email", spend: 3000, revenue: 21000, leads: 150, conversions: 58 },
  ];
  for (const c of campaignDefs) {
    await prisma.campaign.create({
      data: {
        ...c,
        organizationId: org.id,
        startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 28),
      },
    });
  }

  console.log(`Seeded demo org "${org.name}" (slug: nexora-demo)`);
  console.log(`  - ${products.length} products, ${customers.length} customers`);
  console.log(`  - ${saleCount} sales over the last 6 months`);
  console.log(`  - ${expenseCats.length * 6} expense rows, ${campaignDefs.length} campaigns`);
  console.log("Demo login: demo@nexora.app / demo1234");
  console.log("REMINDER: this is DEMO data. It is labelled as such in the UI.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
