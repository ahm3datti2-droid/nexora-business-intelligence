import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getSessionUser, hasRole } from "@/lib/auth";

// Clears the demo dataset for the caller's organization (sales, products,
// customers, expenses, campaigns, inventory, recommendations) and clears
// the demoData flag. Real imported data is NOT touched — this only deletes
// rows belonging to the org, and only when the org is flagged as demo data.
export async function POST() {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!hasRole(user, "ORG_OWNER", "ADMIN", "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Only the owner or an admin can clear demo data." }, { status: 403 });
  }
  try {
    const prisma = getPrisma();
    const orgId = user.organizationId;
    await prisma.$transaction([
      prisma.saleItem.deleteMany({ where: { sale: { organizationId: orgId } } }),
      prisma.sale.deleteMany({ where: { organizationId: orgId } }),
      prisma.inventoryItem.deleteMany({ where: { organizationId: orgId } }),
      prisma.product.deleteMany({ where: { organizationId: orgId } }),
      prisma.customer.deleteMany({ where: { organizationId: orgId } }),
      prisma.expense.deleteMany({ where: { organizationId: orgId } }),
      prisma.campaign.deleteMany({ where: { organizationId: orgId } }),
      prisma.recommendation.deleteMany({ where: { organizationId: orgId } }),
      prisma.organization.update({ where: { id: orgId }, data: { demoData: false } }),
    ]);
    await prisma.auditLog.create({
      data: { organizationId: orgId, userId: user.id, action: "DEMO_DATA_CLEARED", entity: "Organization", details: "Demo dataset cleared." },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Database unavailable." }, { status: 503 });
  }
}
