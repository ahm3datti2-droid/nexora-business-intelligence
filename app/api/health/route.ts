import { NextResponse } from "next/server";
import { isDbConfigured, getPrisma } from "@/lib/prisma";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: true, db: "not-configured" });
  }
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "connected" });
  } catch (e) {
    return NextResponse.json(
      { ok: false, db: "error", error: e instanceof Error ? e.message : "unknown" },
      { status: 503 }
    );
  }
}
