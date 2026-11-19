import { AppShell } from "@/components/AppShell";
import OptimizationClient from "@/components/OptimizationClient";
import { requireOrg } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function OptimizationPage() {
  await requireOrg();
  return (
    <AppShell active="/optimization">
      <OptimizationClient />
    </AppShell>
  );
}
