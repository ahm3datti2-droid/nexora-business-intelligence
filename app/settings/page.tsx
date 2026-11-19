import { AppShell } from "@/components/AppShell";
import { Card, DbNotConfigured } from "@/components/ui";
import { getPrisma, isDbConfigured } from "@/lib/prisma";
import { lang, requireOrg } from "@/lib/server";
import { ClearDemoButton } from "@/components/ClearDemoButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, org } = await requireOrg();
  const l = await lang();
  if (!isDbConfigured()) return <AppShell active="/settings"><DbNotConfigured lang={l} /></AppShell>;
  const users = await getPrisma().user.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell active="/settings">
      <h1 className="text-2xl font-black">Organization Settings</h1>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Workspace">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-[#8B9BB2]">Name</dt><dd className="font-semibold">{org.name}</dd></div>
            <div className="flex justify-between"><dt className="text-[#8B9BB2]">Slug</dt><dd>{org.slug}</dd></div>
            <div className="flex justify-between"><dt className="text-[#8B9BB2]">Plan</dt><dd className="font-semibold text-[#80B8FF]">{org.plan}</dd></div>
            <div className="flex justify-between"><dt className="text-[#8B9BB2]">Currency</dt><dd>{org.currency}</dd></div>
            <div className="flex justify-between"><dt className="text-[#8B9BB2]">Timezone</dt><dd>{org.timezone}</dd></div>
            <div className="flex justify-between"><dt className="text-[#8B9BB2]">Demo data</dt><dd>{org.demoData ? "Yes — labelled in the UI" : "No"}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-[#8B9BB2]">
            Subscription: {org.plan} plan. Upgrade/downgrade workflows and payment wiring are Phase 6 — no fake payment confirmations are implemented.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/settings/data" className="rounded-lg bg-[#2878FF] px-4 py-2 text-sm font-semibold text-white">Data & CSV import</a>
            {org.demoData && <ClearDemoButton />}
          </div>
        </Card>
        <Card title="Users in this workspace">
          <table className="w-full text-sm">
            <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Name</th><th className="text-start">Email</th><th className="text-end">Role</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#142B55]">
                  <td className="py-2">{u.name}{u.id === user.id ? " (you)" : ""}</td>
                  <td>{u.email}</td>
                  <td className="text-end">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </AppShell>
  );
}
