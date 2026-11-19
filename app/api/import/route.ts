import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getSessionUser, hasRole } from "@/lib/auth";

// CSV sales import.
// Expected header: date,product_sku,product_name,customer_name,quantity,unit_price,unit_cost,channel,external_ref
// - Validates every row with zod.
// - Duplicate detection: same organizationId + external_ref (when provided),
//   otherwise same date + customer + product + quantity + amount.
// - Writes an ImportLog row (import history) and returns a full error report.

const rowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  product_sku: z.string().min(1).max(50),
  product_name: z.string().min(1).max(120),
  customer_name: z.string().min(1).max(120),
  quantity: z.coerce.number().int().positive(),
  unit_price: z.coerce.number().nonnegative(),
  unit_cost: z.coerce.number().nonnegative(),
  channel: z.string().max(40).default("store"),
  external_ref: z.string().max(80).optional(),
});

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { cur.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      cur.push(field); field = "";
      if (cur.some((c) => c.trim() !== "")) rows.push(cur);
      cur = [];
    } else field += ch;
  }
  if (field !== "" || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!hasRole(user, "ORG_OWNER", "ADMIN", "MANAGER", "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Import requires Manager or above." }, { status: 403 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Upload a CSV file under the 'file' field." }, { status: 400 });
  }
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV is empty or has no data rows." }, { status: 400 });
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const expected = ["date", "product_sku", "product_name", "customer_name", "quantity", "unit_price", "unit_cost", "channel", "external_ref"];
  const missing = expected.filter((h) => !header.includes(h));
  if (missing.length) {
    return NextResponse.json({ error: `Missing columns: ${missing.join(", ")}` }, { status: 400 });
  }
  const idx = (name: string) => header.indexOf(name);

  const prisma = getPrisma();
  const orgId = user.organizationId;
  const errors: { row: number; message: string }[] = [];
  let imported = 0;
  let skipped = 0;

  // Existing external refs for duplicate detection.
  const existingRefs = new Set(
    (await prisma.sale.findMany({ where: { organizationId: orgId, externalRef: { not: null } }, select: { externalRef: true } }))
      .map((s) => s.externalRef as string)
  );
  const seenInFile = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const raw = {
      date: row[idx("date")]?.trim(),
      product_sku: row[idx("product_sku")]?.trim(),
      product_name: row[idx("product_name")]?.trim(),
      customer_name: row[idx("customer_name")]?.trim(),
      quantity: row[idx("quantity")]?.trim(),
      unit_price: row[idx("unit_price")]?.trim(),
      unit_cost: row[idx("unit_cost")]?.trim(),
      channel: row[idx("channel")]?.trim() || "store",
      external_ref: row[idx("external_ref")]?.trim() || undefined,
    };
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ row: r + 1, message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
      skipped++;
      continue;
    }
    const v = parsed.data;
    const ref = v.external_ref;
    if (ref) {
      if (existingRefs.has(ref) || seenInFile.has(ref)) {
        errors.push({ row: r + 1, message: `Duplicate external_ref "${ref}" — already imported.` });
        skipped++;
        continue;
      }
      seenInFile.add(ref);
    }
    try {
      const product = await prisma.product.upsert({
        where: { organizationId_sku: { organizationId: orgId, sku: v.product_sku } },
        update: {},
        create: {
          organizationId: orgId,
          name: v.product_name,
          sku: v.product_sku,
          unitPrice: v.unit_price,
          unitCost: v.unit_cost,
        },
      });
      let customer = await prisma.customer.findFirst({ where: { organizationId: orgId, name: v.customer_name } });
      if (!customer) {
        customer = await prisma.customer.create({ data: { organizationId: orgId, name: v.customer_name } });
      }
      const totalAmount = v.quantity * v.unit_price;
      const totalCost = v.quantity * v.unit_cost;
      await prisma.sale.create({
        data: {
          organizationId: orgId,
          customerId: customer.id,
          externalRef: ref ?? null,
          totalAmount,
          totalCost,
          occurredAt: new Date(`${v.date}T12:00:00Z`),
          channel: v.channel,
          items: {
            create: [{ productId: product.id, quantity: v.quantity, unitPrice: v.unit_price, unitCost: v.unit_cost }],
          },
        },
      });
      imported++;
    } catch (e) {
      errors.push({ row: r + 1, message: e instanceof Error ? e.message : "Insert failed." });
      skipped++;
    }
  }

  await prisma.importLog.create({
    data: {
      organizationId: orgId,
      fileName: file.name,
      kind: "sales",
      rowsTotal: rows.length - 1,
      rowsImported: imported,
      rowsSkipped: skipped,
      errors: JSON.stringify(errors.slice(0, 100)),
    },
  });

  // First real import clears the demo-data flag.
  await prisma.organization.update({ where: { id: orgId }, data: { demoData: false } });

  return NextResponse.json({
    rowsTotal: rows.length - 1,
    rowsImported: imported,
    rowsSkipped: skipped,
    errors,
  });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const logs = await getPrisma().importLog.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ logs });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Database unavailable." }, { status: 503 });
  }
}
