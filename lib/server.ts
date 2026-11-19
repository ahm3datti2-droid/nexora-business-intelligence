import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionOrg } from "./auth";
import type { Lang } from "./i18n";

export async function requireOrg() {
  const { user, org } = await getSessionOrg();
  if (!user) redirect("/login");
  if (!user.organizationId || !org) redirect("/login");
  return { user, org };
}

export async function lang(): Promise<Lang> {
  const jar = await cookies();
  return jar.get("nx-lang")?.value === "en" ? "en" : "ar";
}
