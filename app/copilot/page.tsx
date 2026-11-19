import { AppShell } from "@/components/AppShell";
import CopilotClient from "@/components/CopilotClient";
import { requireOrg } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  await requireOrg();
  return (
    <AppShell active="/copilot">
      <CopilotClient />
    </AppShell>
  );
}
