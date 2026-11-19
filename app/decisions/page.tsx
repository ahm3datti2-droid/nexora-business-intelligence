import { AppShell } from "@/components/AppShell";
import { Card, DbNotConfigured, DemoBadge } from "@/components/ui";
import { DecisionActions } from "@/components/DecisionActions";
import { getPrisma, isDbConfigured } from "@/lib/prisma";
import { generateRecommendations } from "@/lib/recommendations";
import { lang, requireOrg } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function DecisionsPage() {
  const { org } = await requireOrg();
  const l = await lang();
  if (!isDbConfigured()) return <AppShell active="/decisions"><DbNotConfigured lang={l} /></AppShell>;
  const prisma = getPrisma();

  // Regenerate rule-based recommendations from current data (idempotent:
  // same type+title for the org is upserted, never duplicated).
  const drafts = await generateRecommendations(prisma, org.id, org.currency);
  for (const d of drafts) {
    const existing = await prisma.recommendation.findFirst({
      where: { organizationId: org.id, type: d.type, title: d.title },
    });
    if (existing) {
      await prisma.recommendation.update({ where: { id: existing.id }, data: { ...d, status: existing.status } });
    } else {
      await prisma.recommendation.create({ data: { ...d, organizationId: org.id } });
    }
  }
  const recs = await prisma.recommendation.findMany({
    where: { organizationId: org.id },
    include: { assignee: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const riskColor = (r: string) => (r === "HIGH" ? "text-red-400" : r === "MEDIUM" ? "text-amber-300" : "text-green-400");

  return (
    <AppShell active="/decisions">
      <h1 className="text-2xl font-black">Decision Intelligence Center</h1>
      <p className="mt-1 text-sm text-[#8B9BB2]">
        Recommendations generated from your real data by transparent rules. Approve, reject or assign each one — actions are saved and audit-logged.
      </p>
      <div className="mt-4">{org.demoData && <DemoBadge lang={l} />}</div>
      {recs.length === 0 ? (
        <Card title="No recommendations right now">
          <p className="text-sm text-[#8B9BB2]">The rule engine found no issues in the current data. Import more data or check back after new sales.</p>
        </Card>
      ) : (
        <div className="mt-4 grid gap-4">
          {recs.map((r) => (
            <Card key={r.id} title={r.title}>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div><div className="font-semibold text-[#80B8FF]">Problem</div><p className="text-[#F4F7FC]">{r.problem}</p></div>
                <div><div className="font-semibold text-[#80B8FF]">Supporting data</div><p>{r.supportingData}</p></div>
                <div><div className="font-semibold text-[#80B8FF]">Proposed action</div><p>{r.proposedAction}</p></div>
                <div><div className="font-semibold text-[#80B8FF]">Expected impact</div><p>{r.expectedImpact}</p></div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                <span>Risk: <b className={riskColor(r.risk)}>{r.risk}</b></span>
                <span>Confidence: <b>{r.confidence}%</b> (rule-based, sample stated above)</span>
                <span>Status: <b>{r.status}</b></span>
                {r.assignee && <span>Assignee: {r.assignee.name}</span>}
                <span className="ms-auto"><DecisionActions id={r.id} status={r.status} /></span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
