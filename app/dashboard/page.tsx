import { AppShell } from "@/components/AppShell";
import { Card, DbNotConfigured, DemoBadge, StatCard } from "@/components/ui";
import { RevenueChart } from "@/components/RevenueChart";
import { getPrisma, isDbConfigured } from "@/lib/prisma";
import { getDict } from "@/lib/i18n";
import { lang, requireOrg } from "@/lib/server";
import { lastMonths, money, pctChange, performanceScore } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { org } = await requireOrg();
  const l = await lang();
  const t = getDict(l);

  if (!isDbConfigured()) {
    return (
      <AppShell active="/dashboard">
        <DbNotConfigured lang={l} />
      </AppShell>
    );
  }

  let data;
  try {
    const prisma = getPrisma();
    const orgId = org.id;
    const months = lastMonths(6);
    const [sales, expenses, customers, campaigns] = await Promise.all([
      prisma.sale.findMany({ where: { organizationId: orgId }, select: { totalAmount: true, totalCost: true, occurredAt: true, customerId: true } }),
      prisma.expense.findMany({ where: { organizationId: orgId }, select: { amount: true, occurredAt: true } }),
      prisma.customer.findMany({ where: { organizationId: orgId }, select: { id: true, firstSeenAt: true } }),
      prisma.campaign.findMany({ where: { organizationId: orgId }, select: { leads: true, conversions: true } }),
    ]);
    data = { sales, expenses, customers, campaigns, months };
  } catch (e) {
    return (
      <AppShell active="/dashboard">
        <DbNotConfigured lang={l} />
        <p className="mt-3 text-xs text-red-400">{e instanceof Error ? e.message : ""}</p>
      </AppShell>
    );
  }

  const { sales, expenses, customers, campaigns, months } = data;
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const revenue = sales.reduce((s, r) => s + Number(r.totalAmount), 0);
  const cogs = sales.reduce((s, r) => s + Number(r.totalCost), 0);
  const opex = expenses.reduce((s, r) => s + Number(r.amount), 0);
  const netProfit = revenue - cogs - opex;
  const revThis = sales.filter((s) => s.occurredAt >= thisMonthStart).reduce((s, r) => s + Number(r.totalAmount), 0);
  const revLast = sales
    .filter((s) => s.occurredAt >= lastMonthStart && s.occurredAt < thisMonthStart)
    .reduce((s, r) => s + Number(r.totalAmount), 0);
  const growth = pctChange(revThis, revLast);
  const newCustomers = customers.filter((c) => c.firstSeenAt >= thisMonthStart).length;
  const leads = campaigns.reduce((s, c) => s + c.leads, 0);
  const conversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const conversionRate = leads > 0 ? (conversions / leads) * 100 : 0;
  const customerSaleCounts = new Map<string, number>();
  for (const s of sales) {
    if (s.customerId) customerSaleCounts.set(s.customerId, (customerSaleCounts.get(s.customerId) ?? 0) + 1);
  }
  const repeatCustomers = [...customerSaleCounts.values()].filter((n) => n > 1).length;
  const retention = customerSaleCounts.size > 0 ? (repeatCustomers / customerSaleCounts.size) * 100 : 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const score = performanceScore({ growthPct: growth, netMarginPct: netMargin, repeatSharePct: retention, conversionPct: conversionRate });

  const trend = months.map((m) => {
    const ms = sales.filter((s) => s.occurredAt >= m.start && s.occurredAt < m.end);
    return {
      label: m.label,
      revenue: Math.round(ms.reduce((s, r) => s + Number(r.totalAmount), 0)),
      profit: Math.round(ms.reduce((s, r) => s + Number(r.totalAmount) - Number(r.totalCost), 0)),
    };
  });
  const curMonth = trend[trend.length - 1];
  const prevMonth = trend[trend.length - 2];

  return (
    <AppShell active="/dashboard">
      <h1 className="text-2xl font-black">{t.dashboard} — {org.name}</h1>
      <p className="mt-1 text-sm text-[#8B9BB2]">{org.plan} · {org.currency}</p>
      <div className="mt-4">{org.demoData && <DemoBadge lang={l} />}</div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t.totalRevenue} value={money(revenue, org.currency)} sub={growth === null ? "—" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}% vs last month`} />
        <StatCard label={t.netProfit} value={money(netProfit, org.currency)} sub={`${netMargin.toFixed(1)}% net margin`} />
        <StatCard label={t.operatingCosts} value={money(opex, org.currency)} sub={`${sales.length} sales recorded`} />
        <StatCard label={t.salesGrowth} value={growth === null ? "n/a" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`} sub="month over month" />
        <StatCard label={t.customerAcquisition} value={String(newCustomers)} sub={`new this month · ${customers.length} total`} />
        <StatCard label={t.conversionRate} value={`${conversionRate.toFixed(1)}%`} sub={`${conversions} / ${leads} leads`} />
        <StatCard label={t.retention} value={`${retention.toFixed(1)}%`} sub={`${repeatCustomers} repeat customers`} />
        <StatCard label={t.performanceScore} value={`${score.score}/100`} sub={score.components.map((c) => `${c.label} ${c.value}`).join(" · ")} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title={t.revenueTrend}>
            <RevenueChart data={trend} />
          </Card>
        </div>
        <Card title={t.monthlyComparison}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-[#8B9BB2]">
                <th className="py-2 text-start">Month</th>
                <th className="text-end">Revenue</th>
                <th className="text-end">Profit</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((m) => (
                <tr key={m.label} className="border-t border-[#142B55]">
                  <td className="py-2">{m.label}</td>
                  <td className="text-end">{money(m.revenue, org.currency)}</td>
                  <td className="text-end">{money(m.profit, org.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-[#8B9BB2]">
            This month {money(curMonth.revenue, org.currency)} vs last month {money(prevMonth.revenue, org.currency)}.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
