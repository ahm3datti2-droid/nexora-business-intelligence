// ONE-TIME removal script — deletes the demo organization and the
// throwaway tenant-isolation test org from the database, permanently.
// Run on Vercel's build machine (which can reach Neon) via a one-time
// Build Command override, then revert the override immediately:
//   npx prisma generate && npx tsx scripts/remove-demo.ts && npm run build
// Idempotent: deleting nothing reports 0 rows and exits 0.
// DO NOT run this against a database whose demo org you want to keep.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_SLUGS = ["nexora-demo", "isolation-test-co"];
const TARGET_EMAILS = ["demo@nexora.app", "isolation-test@nexora.app"];

async function main() {
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { slug: { in: TARGET_SLUGS } },
        { users: { some: { email: { in: TARGET_EMAILS } } } },
      ],
    },
    select: { id: true, slug: true, name: true },
  });
  console.log(
    `Found ${orgs.length} org(s) to remove:`,
    orgs.map((o) => `${o.slug} (${o.name})`).join(", ") || "(none)"
  );

  for (const org of orgs) {
    const orgId = org.id;
    // Explicit delete order (children first) so nothing depends on Restrict.
    const saleIds = await prisma.sale.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const saleIdList = saleIds.map((s) => s.id);
    if (saleIdList.length > 0) {
      await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIdList } } });
    }
    await prisma.sale.deleteMany({ where: { organizationId: orgId } });
    await prisma.inventoryItem.deleteMany({ where: { organizationId: orgId } });
    await prisma.product.deleteMany({ where: { organizationId: orgId } });
    await prisma.customer.deleteMany({ where: { organizationId: orgId } });
    await prisma.expense.deleteMany({ where: { organizationId: orgId } });
    await prisma.campaign.deleteMany({ where: { organizationId: orgId } });
    await prisma.recommendation.deleteMany({ where: { organizationId: orgId } });
    await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
    await prisma.importLog.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    console.log(`Removed org ${org.slug} (${org.name}) and all its rows.`);
  }

  // Belt and braces: any stray users with the target emails.
  const stray = await prisma.user.deleteMany({ where: { email: { in: TARGET_EMAILS } } });
  console.log(`Removed ${stray.count} stray user(s) with target emails.`);
  console.log("Demo removal complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
