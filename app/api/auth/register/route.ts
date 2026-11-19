import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

const schema = z.object({
  orgName: z.string().min(2).max(100),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "org"
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form fields." }, { status: 400 });
  }
  const { orgName, name, email, password } = parsed.data;
  try {
    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    let slug = slugify(orgName);
    if (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash: await hashPassword(password),
        role: "ORG_OWNER",
        organization: {
          create: { name: orgName, slug, plan: "STARTER", demoData: false },
        },
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "ORG_CREATED",
        entity: "Organization",
        details: `Workspace "${orgName}" created by ${email}.`,
      },
    });
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Database unavailable." },
      { status: 503 }
    );
  }
}
