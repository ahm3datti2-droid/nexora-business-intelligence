import { AppShell } from "@/components/AppShell";
import { Card, DbNotConfigured, DemoBadge, StatCard } from "@/components/ui";
import { getPrisma, isDbConfigured } from "@/lib/prisma";
import { lang, requireOrg } from "@/lib/server";
import { lastMonths, money } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const { org } = await requireOrg();
  const l = await lang();
  if (!isDbConfigured()) return <AppShell active="/finance"><DbNotConfigured lang={l} /></AppShell>;
  const prisma = getPrisma();
  const orgId = org.id;
  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({ where: { organizationId: orgId }, select: { totalAmount: true, totalCost: true, occurredAt: true } }),
    prisma.expense.findMany({ where: { organizationId: orgId }, select: { amount: true, category: true, occurredAt: true } }),
  ]);
  const revenue = sales.reduce((s, r) => s + Number(r.totalAmount), 0);
  const cogs = sales.reduce((s, r) => s + Number(r.totalCost), 0);
  const opex = expenses.reduce((s, r) => s + Number(r.amount), 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - opex;
  const grossMargin = revenue ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue ? (netProfit / revenue) * 100 : 0;

  const byCat = new Map<string, number>();
  for (const e of expenses) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));

  const months = lastMonths(6).map((m) => {
    const rev = sales.filter((s) => s.occurredAt >= m.start && s.occurredAt < m.end).reduce((s, r) => s + Number(r.totalAmount), 0);
    const exp = expenses.filter((e) => e.occurredAt >= m.start && e.occurredAt < m.end).reduce((s, r) => s + Number(r.amount), 0);
    const cg = sales.filter((s) => s.occurredAt >= m.start && s.occurredAt < m.end).reduce((s, r) => s + Number(r.totalCost), 0);
    return { label: m.label, revenue: rev, expenses: exp + cg, net: rev - exp - cg };
  });
  // Simple budget-vs-actual: budget = average monthly expense of the last 6 months.
  const avgMonthlyExpense = months.reduce((s, m) => s + m.expenses, 0) / Math.max(1, months.length);
  const thisMonth = months[months.length - 1];

  return (
    <AppShell active="/finance">
      <h1 className="text-2xl font-black">Financial Intelligence</h1>
      <div className="mt-4">{org.demoData && <DemoBadge lang={l} />}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue" value={money(revenue, org.currency)} />
        <StatCard label="Gross profit" value={money(grossProfit, org.currency)} sub={`${grossMargin.toFixed(1)}% margin`} />
        <StatCard label="Operating expenses" value={money(opex, org.currency)} />
        <StatCard label="Net profit" value={money(netProfit, org.currency)} sub={`${netMargin.toFixed(1)}% net margin`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Profit & loss — monthly">
          <table className="w-full text-sm">
            <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Month</th><th className="text-end">Revenue</th><th className="text-end">Costs</th><th className="text-end">Net</th></tr></thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.label} className="border-t border-[#142B55]">
                  <td className="py-2">{m.label}</td>
                  <td className="text-end">{money(m.revenue, org.currency)}</td>
                  <td className="text-end">{money(m.expenses, org.currency)}</td>
                  <td className={`text-end font-bold ${m.net >= 0 ? "text-green-400" : "text-red-400"}`}>{money(m.net, org.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="space-y-4">
          <Card title="Expenses by category">
            {[...byCat.entries()].map(([cat, amt]) => (
              <div key={cat} className="flex justify-between border-b border-[#142B55] py-2 text-sm last:border-0">
                <span>{cat}</span><span className="font-bold">{money(amt, org.currency)}</span>
              </div>
            ))}
          </Card>
          <Card title="Budget vs actual (this month)">
            <p className="text-sm text-[#8B9BB2]">
              Budget baseline = 6-month average monthly cost: <b className="text-white">{money(avgMonthlyExpense, org.currency)}</b>
            </p>
            <p className="mt-2 text-sm">
              Actual this month: <b>{money(thisMonth.expenses, org.currency)}</b> —{" "}
              {thisMonth.expenses <= avgMonthlyExpense ? "within budget" : "over budget"} by{" "}
              <b>{money(Math.abs(thisMonth.expenses - avgMonthlyExpense), org.currency)}</b>.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
