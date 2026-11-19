import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET /api/reports/export?range=30d|90d|all&format=csv
// Real CSV export of the org's sales, computed from the database.
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "30d";
  const days = range === "all" ? null : range === "90d" ? 90 : 30;
  const since = days ? new Date(Date.now() - days * 86400000) : undefined;
  try {
    const sales = await getPrisma().sale.findMany({
      where: {
        organizationId: user.organizationId,
        ...(since ? { occurredAt: { gte: since } } : {}),
      },
      include: { customer: { select: { name: true } }, items: { include: { product: { select: { name: true, sku: true } } } } },
      orderBy: { occurredAt: "asc" },
    });
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = ["date,customer,channel,product_sku,product_name,quantity,unit_price,unit_cost,total_amount,total_cost,external_ref"];
    for (const s of sales) {
      for (const it of s.items) {
        lines.push([
          s.occurredAt.toISOString().slice(0, 10),
          esc(s.customer?.name ?? ""),
          s.channel,
          it.product.sku,
          esc(it.product.name),
          String(it.quantity),
          Number(it.unitPrice).toFixed(2),
          Number(it.unitCost).toFixed(2),
          Number(s.totalAmount).toFixed(2),
          Number(s.totalCost).toFixed(2),
          s.externalRef ?? "",
        ].join(","));
      }
    }
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nexora-sales-${range}.csv"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Database unavailable." }, { status: 503 });
  }
}
