import { AppShell } from "@/components/AppShell";
import { Card, DbNotConfigured, DemoBadge, StatCard } from "@/components/ui";
import { getPrisma, isDbConfigured } from "@/lib/prisma";
import { lang, requireOrg } from "@/lib/server";
import { money } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const { org } = await requireOrg();
  const l = await lang();
  if (!isDbConfigured()) return <AppShell active="/sales"><DbNotConfigured lang={l} /></AppShell>;
  const prisma = getPrisma();
  const orgId = org.id;
  const [sales, productPerf] = await Promise.all([
    prisma.sale.findMany({ where: { organizationId: orgId }, include: { customer: { select: { name: true } } }, orderBy: { occurredAt: "desc" }, take: 50 }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sale: { organizationId: orgId } },
      _sum: { quantity: true },
      _count: { _all: true },
    }),
  ]);
  const productIds = productPerf.map((p) => p.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const perf = productPerf
    .map((p) => {
      const prod = byId.get(p.productId);
      if (!prod) return null;
      const qty = p._sum.quantity ?? 0;
      return {
        name: prod.name, sku: prod.sku, qty,
        revenue: qty * Number(prod.unitPrice),
        margin: qty * (Number(prod.unitPrice) - Number(prod.unitCost)),
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.revenue - a.revenue);

  const revenue = sales.reduce((s, r) => s + Number(r.totalAmount), 0);
  const profit = sales.reduce((s, r) => s + Number(r.totalAmount) - Number(r.totalCost), 0);
  const avgOrder = sales.length ? revenue / sales.length : 0;
  const marginPct = revenue ? (profit / revenue) * 100 : 0;

  return (
    <AppShell active="/sales">
      <h1 className="text-2xl font-black">Sales Intelligence</h1>
      <div className="mt-4">{org.demoData && <DemoBadge lang={l} />}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total revenue (all sales)" value={money(revenue, org.currency)} />
        <StatCard label="Gross profit" value={money(profit, org.currency)} sub={`${marginPct.toFixed(1)}% margin`} />
        <StatCard label="Average order value" value={money(avgOrder, org.currency)} />
        <StatCard label="Sales recorded" value={String(sales.length)} sub="latest 50 shown" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Product performance">
          {perf.length === 0 ? <p className="text-sm text-[#8B9BB2]">No sales yet — import data to see product performance.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Product</th><th className="text-end">Qty</th><th className="text-end">Revenue</th><th className="text-end">Margin</th></tr></thead>
              <tbody>
                {perf.map((p) => (
                  <tr key={p.sku} className="border-t border-[#142B55]">
                    <td className="py-2">{p.name} <span className="text-[#8B9BB2]">({p.sku})</span></td>
                    <td className="text-end">{p.qty}</td>
                    <td className="text-end">{money(p.revenue, org.currency)}</td>
                    <td className="text-end">{money(p.margin, org.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Recent sales">
          {sales.length === 0 ? <p className="text-sm text-[#8B9BB2]">No sales yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Date</th><th className="text-start">Customer</th><th className="text-end">Amount</th></tr></thead>
              <tbody>
                {sales.slice(0, 12).map((s) => (
                  <tr key={s.id} className="border-t border-[#142B55]">
                    <td className="py-2">{s.occurredAt.toISOString().slice(0, 10)}</td>
                    <td>{s.customer?.name ?? "—"}</td>
                    <td className="text-end">{money(Number(s.totalAmount), org.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
