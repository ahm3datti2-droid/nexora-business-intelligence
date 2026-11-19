import { AppShell } from "@/components/AppShell";
import { Card, DbNotConfigured, DemoBadge } from "@/components/ui";
import { getPrisma, isDbConfigured } from "@/lib/prisma";
import { lang, requireOrg } from "@/lib/server";
import { PrintButton } from "@/components/PrintButton";
import { money } from "@/lib/analytics";

export const dynamic = "force-dynamic";

async function ReportTable({ range, orgId, currency }: { range: string; orgId: string; currency: string }) {
  const days = range === "all" ? null : range === "90d" ? 90 : 30;
  const now = new Date();
  const since = days ? new Date(now.getTime() - days * 86400000) : undefined;
  const prisma = getPrisma();
  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({ where: { organizationId: orgId, ...(since ? { occurredAt: { gte: since } } : {}) }, orderBy: { occurredAt: "desc" }, take: 100 }),
    prisma.expense.findMany({ where: { organizationId: orgId, ...(since ? { occurredAt: { gte: since } } : {}) } }),
  ]);
  const revenue = sales.reduce((s, r) => s + Number(r.totalAmount), 0);
  const costs = sales.reduce((s, r) => s + Number(r.totalCost), 0) + expenses.reduce((s, r) => s + Number(r.amount), 0);
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl border border-[#142B55] p-3">Revenue <b className="block text-lg">{money(revenue, currency)}</b></div>
        <div className="rounded-xl border border-[#142B55] p-3">Costs <b className="block text-lg">{money(costs, currency)}</b></div>
        <div className="rounded-xl border border-[#142B55] p-3">Net <b className="block text-lg">{money(revenue - costs, currency)}</b></div>
      </div>
      <p className="mt-3 text-xs text-[#8B9BB2]">{sales.length} sales in scope ({range}).</p>
    </div>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { org } = await requireOrg();
  const l = await lang();
  const sp = await searchParams;
  const range = sp.range ?? "30d";
  if (!isDbConfigured()) return <AppShell active="/reports"><DbNotConfigured lang={l} /></AppShell>;

  return (
    <AppShell active="/reports">
      <h1 className="text-2xl font-black">Reports Center</h1>
      <p className="mt-1 text-sm text-[#8B9BB2]">Daily, weekly and monthly summaries computed from your database. Export real CSV or print the page.</p>
      <div className="mt-4">{org.demoData && <DemoBadge lang={l} />}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["30d", "90d", "all"].map((r) => (
          <a key={r} href={`/reports?range=${r}`} className={`rounded-lg px-4 py-2 text-sm font-semibold ${range === r ? "bg-[#2878FF] text-white" : "bg-[#0D1B2D] text-[#8B9BB2]"}`}>
            {r === "30d" ? "Last 30 days" : r === "90d" ? "Last 90 days" : "All time"}
          </a>
        ))}
        <a href={`/api/reports/export?range=${range}`} className="rounded-lg bg-[#142B55] px-4 py-2 text-sm font-semibold text-white">Download CSV</a>
        <PrintButton />
      </div>
      <div className="mt-4">
        <Card title={`Business report — ${range}`}>
          <ReportTable range={range} orgId={org.id} currency={org.currency} />
        </Card>
      </div>
    </AppShell>
  );
}
