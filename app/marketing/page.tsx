import { AppShell } from "@/components/AppShell";
import { Card, DbNotConfigured, DemoBadge, StatCard } from "@/components/ui";
import { getPrisma, isDbConfigured } from "@/lib/prisma";
import { lang, requireOrg } from "@/lib/server";
import { money } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const { org } = await requireOrg();
  const l = await lang();
  if (!isDbConfigured()) return <AppShell active="/marketing"><DbNotConfigured lang={l} /></AppShell>;
  const campaigns = await getPrisma().campaign.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" } });
  const spend = campaigns.reduce((s, c) => s + Number(c.spend), 0);
  const revenue = campaigns.reduce((s, c) => s + Number(c.revenue), 0);
  const leads = campaigns.reduce((s, c) => s + c.leads, 0);
  const conversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const roas = spend > 0 ? revenue / spend : 0;
  const cac = conversions > 0 ? spend / conversions : 0;
  const cpl = leads > 0 ? spend / leads : 0;

  return (
    <AppShell active="/marketing">
      <h1 className="text-2xl font-black">Marketing Intelligence</h1>
      <div className="mt-4">{org.demoData && <DemoBadge lang={l} />}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total ad spend" value={money(spend, org.currency)} />
        <StatCard label="Attributed revenue" value={money(revenue, org.currency)} />
        <StatCard label="ROAS" value={`${roas.toFixed(2)}x`} sub={roas >= 2 ? "Healthy (≥ 2x)" : "Below 2x — review budget"} />
        <StatCard label="CAC / CPL" value={`${money(cac, org.currency)} / ${money(cpl, org.currency)}`} sub={`${conversions} conversions · ${leads} leads`} />
      </div>
      <div className="mt-4">
        <Card title="Campaign comparison">
          {campaigns.length === 0 ? <p className="text-sm text-[#8B9BB2]">No campaigns yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Campaign</th><th className="text-start">Channel</th><th className="text-end">Spend</th><th className="text-end">Revenue</th><th className="text-end">ROAS</th><th className="text-end">CAC</th><th className="text-end">Conv.</th></tr></thead>
              <tbody>
                {campaigns.map((c) => {
                  const cSpend = Number(c.spend);
                  const cRev = Number(c.revenue);
                  return (
                    <tr key={c.id} className="border-t border-[#142B55]">
                      <td className="py-2">{c.name}</td>
                      <td>{c.channel}</td>
                      <td className="text-end">{money(cSpend, org.currency)}</td>
                      <td className="text-end">{money(cRev, org.currency)}</td>
                      <td className="text-end font-bold">{cSpend > 0 ? (cRev / cSpend).toFixed(2) + "x" : "—"}</td>
                      <td className="text-end">{c.conversions > 0 ? money(cSpend / c.conversions, org.currency) : "—"}</td>
                      <td className="text-end">{c.conversions} / {c.leads}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-[#8B9BB2]">
            Budget tip: the Optimization page can re-allocate spend across channels using each channel&apos;s measured return.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
