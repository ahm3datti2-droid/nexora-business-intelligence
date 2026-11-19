import { AppShell } from "@/components/AppShell";
import { Card, DbNotConfigured, DemoBadge, StatCard } from "@/components/ui";
import { getPrisma, isDbConfigured } from "@/lib/prisma";
import { lang, requireOrg } from "@/lib/server";
import { money } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const { org } = await requireOrg();
  const l = await lang();
  if (!isDbConfigured()) return <AppShell active="/customers"><DbNotConfigured lang={l} /></AppShell>;
  const prisma = getPrisma();
  const orgId = org.id;
  const now = new Date();
  const [customers, sales] = await Promise.all([
    prisma.customer.findMany({ where: { organizationId: orgId }, orderBy: { firstSeenAt: "asc" } }),
    prisma.sale.findMany({ where: { organizationId: orgId }, select: { customerId: true, totalAmount: true, occurredAt: true } }),
  ]);
  const byCustomer = new Map<string, { count: number; revenue: number; last: Date }>();
  for (const s of sales) {
    if (!s.customerId) continue;
    const cur = byCustomer.get(s.customerId) ?? { count: 0, revenue: 0, last: new Date(0) };
    cur.count++;
    cur.revenue += Number(s.totalAmount);
    if (s.occurredAt > cur.last) cur.last = s.occurredAt;
    byCustomer.set(s.customerId, cur);
  }
  const rows = customers.map((c) => {
    const stats = byCustomer.get(c.id) ?? { count: 0, revenue: 0, last: null as Date | null };
    const daysSinceLast = stats.last ? Math.floor((now.getTime() - stats.last.getTime()) / 86400000) : null;
    // Churn-risk flag: no purchase in 90+ days while having bought before.
    const churnRisk = stats.count > 0 && daysSinceLast !== null && daysSinceLast > 90;
    return { ...c, orders: stats.count, clv: stats.revenue, last: stats.last, daysSinceLast, churnRisk };
  });
  const activeCustomers = rows.filter((r) => r.orders > 0);
  const avgClv = activeCustomers.length ? activeCustomers.reduce((s, r) => s + r.clv, 0) / activeCustomers.length : 0;
  const repeat = rows.filter((r) => r.orders > 1).length;
  const churnCount = rows.filter((r) => r.churnRisk).length;
  const segments = new Map<string, number>();
  for (const c of customers) segments.set(c.segment, (segments.get(c.segment) ?? 0) + 1);

  return (
    <AppShell active="/customers">
      <h1 className="text-2xl font-black">Customer Intelligence</h1>
      <div className="mt-4">{org.demoData && <DemoBadge lang={l} />}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total customers" value={String(customers.length)} />
        <StatCard label="Average CLV" value={money(avgClv, org.currency)} sub="revenue per buying customer" />
        <StatCard label="Repeat customers" value={String(repeat)} sub={`${activeCustomers.length ? ((repeat / activeCustomers.length) * 100).toFixed(1) : "0.0"}% of buyers`} />
        <StatCard label="Churn-risk customers" value={String(churnCount)} sub="no purchase in 90+ days" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Segments">
          {[...segments.entries()].map(([seg, n]) => (
            <div key={seg} className="flex justify-between border-b border-[#142B55] py-2 text-sm last:border-0">
              <span>{seg}</span><span className="font-bold">{n}</span>
            </div>
          ))}
        </Card>
        <div className="lg:col-span-2">
          <Card title="Customers — lifetime value & churn risk">
            <table className="w-full text-sm">
              <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Customer</th><th className="text-end">Orders</th><th className="text-end">CLV</th><th className="text-end">Last order</th><th className="text-end">Risk</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#142B55]">
                    <td className="py-2">{r.name} <span className="text-[#8B9BB2]">({r.segment})</span></td>
                    <td className="text-end">{r.orders}</td>
                    <td className="text-end">{money(r.clv, org.currency)}</td>
                    <td className="text-end">{r.last ? r.last.toISOString().slice(0, 10) : "—"}</td>
                    <td className="text-end">{r.churnRisk ? <span className="font-bold text-red-400">Churn risk</span> : r.orders === 0 ? "No orders" : "Active"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
