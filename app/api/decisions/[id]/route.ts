import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "ASSIGNED", "DONE", "PENDING"]),
  assigneeId: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  try {
    const prisma = getPrisma();
    const rec = await prisma.recommendation.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!rec) return NextResponse.json({ error: "Recommendation not found." }, { status: 404 });
    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        status: parsed.data.status,
        assigneeId: parsed.data.assigneeId ?? (parsed.data.status === "ASSIGNED" ? user.id : rec.assigneeId),
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "RECOMMENDATION_" + parsed.data.status,
        entity: "Recommendation",
        entityId: id,
        details: `${user.email} set "${rec.title}" to ${parsed.data.status}.`,
      },
    });
    return NextResponse.json({ ok: true, recommendation: updated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Database unavailable." }, { status: 503 });
  }
}
