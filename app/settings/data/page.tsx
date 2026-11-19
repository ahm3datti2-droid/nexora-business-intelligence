import { AppShell } from "@/components/AppShell";
import DataImportClient from "@/components/DataImportClient";
import { getPrisma, isDbConfigured } from "@/lib/prisma";
import { requireOrg } from "@/lib/server";
import { DbNotConfigured } from "@/components/ui";
import { lang } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function DataImportPage() {
  const { org } = await requireOrg();
  const l = await lang();
  if (!isDbConfigured()) {
    return (
      <AppShell active="/settings">
        <DbNotConfigured lang={l} />
      </AppShell>
    );
  }
  const logs = await getPrisma().importLog.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return (
    <AppShell active="/settings/data">
      <DataImportClient
        initialLogs={logs.map((l) => ({
          id: l.id,
          fileName: l.fileName,
          kind: l.kind,
          rowsTotal: l.rowsTotal,
          rowsImported: l.rowsImported,
          rowsSkipped: l.rowsSkipped,
          createdAt: l.createdAt.toISOString(),
        }))}
      />
    </AppShell>
  );
}
