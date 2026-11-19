import { AppShell } from "@/components/AppShell";
import { Card, DbNotConfigured, DemoBadge, StatCard } from "@/components/ui";
import { getPrisma, isDbConfigured } from "@/lib/prisma";
import { lang, requireOrg } from "@/lib/server";
import { money } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const { org } = await requireOrg();
  const l = await lang();
  if (!isDbConfigured()) return <AppShell active="/inventory"><DbNotConfigured lang={l} /></AppShell>;
  const prisma = getPrisma();
  const items = await prisma.inventoryItem.findMany({
    where: { organizationId: org.id },
    include: { product: true },
    orderBy: { quantityOnHand: "asc" },
  });
  const now = new Date();
  const lowStock = items.filter((i) => i.quantityOnHand <= i.reorderPoint);
  const deadStock = items.filter(
    (i) => i.lastSoldAt && now.getTime() - i.lastSoldAt.getTime() > 90 * 86400000 && i.quantityOnHand > 0
  );
  const stockValue = items.reduce((s, i) => s + i.quantityOnHand * Number(i.product.unitCost), 0);
  const totalUnits = items.reduce((s, i) => s + i.quantityOnHand, 0);

  return (
    <AppShell active="/inventory">
      <h1 className="text-2xl font-black">Inventory Intelligence</h1>
      <div className="mt-4">{org.demoData && <DemoBadge lang={l} />}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Stock value (at cost)" value={money(stockValue, org.currency)} />
        <StatCard label="Units on hand" value={String(totalUnits)} />
        <StatCard label="Low-stock alerts" value={String(lowStock.length)} sub="at or below reorder point" />
        <StatCard label="Dead stock (no sale 90+ days)" value={String(deadStock.length)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Low-stock alerts — reorder recommendations">
          {lowStock.length === 0 ? <p className="text-sm text-[#8B9BB2]">No low-stock items.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Product</th><th className="text-end">On hand</th><th className="text-end">Reorder pt</th><th className="text-end">Suggested order</th></tr></thead>
              <tbody>
                {lowStock.map((i) => (
                  <tr key={i.id} className="border-t border-[#142B55]">
                    <td className="py-2">{i.product.name}</td>
                    <td className="text-end font-bold text-amber-300">{i.quantityOnHand}</td>
                    <td className="text-end">{i.reorderPoint}</td>
                    <td className="text-end">{i.reorderQty} units</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="All inventory">
          <table className="w-full text-sm">
            <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Product</th><th className="text-end">On hand</th><th className="text-end">Last sold</th><th className="text-end">Status</th></tr></thead>
            <tbody>
              {items.map((i) => {
                const dead = deadStock.some((d) => d.id === i.id);
                const low = i.quantityOnHand <= i.reorderPoint;
                return (
                  <tr key={i.id} className="border-t border-[#142B55]">
                    <td className="py-2">{i.product.name}</td>
                    <td className="text-end">{i.quantityOnHand}</td>
                    <td className="text-end">{i.lastSoldAt ? i.lastSoldAt.toISOString().slice(0, 10) : "—"}</td>
                    <td className="text-end">{dead ? "Dead stock" : low ? "Low stock" : "Healthy"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </AppShell>
  );
}
