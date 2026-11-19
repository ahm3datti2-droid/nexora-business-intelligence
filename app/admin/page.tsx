import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, DbNotConfigured } from "@/components/ui";
import { getPrisma, isDbConfigured } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { lang } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");
  const l = await lang();
  if (!isDbConfigured()) return <AppShell active="/admin"><DbNotConfigured lang={l} /></AppShell>;
  const prisma = getPrisma();
  const [orgs, users, logs] = await Promise.all([
    prisma.organization.findMany({ include: { _count: { select: { users: true, sales: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <AppShell active="/admin">
      <h1 className="text-2xl font-black">Super Admin Panel</h1>
      <p className="mt-1 text-sm text-[#8B9BB2]">Platform-wide view. Only SUPER_ADMIN can see this page.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={`Organizations (${orgs.length})`}>
          <table className="w-full text-sm">
            <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Name</th><th className="text-end">Plan</th><th className="text-end">Users</th><th className="text-end">Sales</th></tr></thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-t border-[#142B55]">
                  <td className="py-2">{o.name} <span className="text-[#8B9BB2]">({o.slug})</span>{o.demoData ? " · demo" : ""}</td>
                  <td className="text-end">{o.plan}</td>
                  <td className="text-end">{o._count.users}</td>
                  <td className="text-end">{o._count.sales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title={`Users (${users.length})`}>
          <table className="w-full text-sm">
            <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Name</th><th className="text-start">Email</th><th className="text-end">Role</th></tr></thead>
            <tbody>
              {users.slice(0, 15).map((u) => (
                <tr key={u.id} className="border-t border-[#142B55]">
                  <td className="py-2">{u.name}</td>
                  <td>{u.email}</td>
                  <td className="text-end">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <div className="mt-4">
        <Card title="Audit log (latest 50)">
          {logs.length === 0 ? <p className="text-sm text-[#8B9BB2]">No audit events yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Time</th><th className="text-start">Action</th><th className="text-start">Details</th></tr></thead>
              <tbody>
                {logs.map((a) => (
                  <tr key={a.id} className="border-t border-[#142B55]">
                    <td className="py-2">{a.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                    <td>{a.action}</td>
                    <td>{a.details ?? "—"}</td>
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
