import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { money, pctChange } from "@/lib/analytics";

const schema = z.object({ question: z.string().min(1).max(2000) });

async function orgSummary(orgId: string) {
  const prisma = getPrisma();
  const [sales, expenses, customers, products] = await Promise.all([
    prisma.sale.findMany({ where: { organizationId: orgId }, select: { totalAmount: true, totalCost: true, occurredAt: true } }),
    prisma.expense.findMany({ where: { organizationId: orgId }, select: { amount: true, category: true, occurredAt: true } }),
    prisma.customer.count({ where: { organizationId: orgId } }),
    prisma.product.count({ where: { organizationId: orgId } }),
  ]);
  const revenue = sales.reduce((s, r) => s + Number(r.totalAmount), 0);
  const cogs = sales.reduce((s, r) => s + Number(r.totalCost), 0);
  const opex = expenses.reduce((s, r) => s + Number(r.amount), 0);
  const netProfit = revenue - cogs - opex;
  const margin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : "0.0";
  const now = new Date();
  const thisMonth = sales.filter((s) => s.occurredAt >= new Date(now.getFullYear(), now.getMonth(), 1));
  const lastMonth = sales.filter(
    (s) =>
      s.occurredAt >= new Date(now.getFullYear(), now.getMonth() - 1, 1) &&
      s.occurredAt < new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const growth = pctChange(
    thisMonth.reduce((s, r) => s + Number(r.totalAmount), 0),
    lastMonth.reduce((s, r) => s + Number(r.totalAmount), 0)
  );
  return { revenue, cogs, opex, netProfit, margin, customers, products, salesCount: sales.length, growth };
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please ask a question." }, { status: 400 });
  }

  let summary;
  try {
    summary = await orgSummary(user.organizationId);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Database unavailable." },
      { status: 503 }
    );
  }

  const facts = [
    `Total revenue (all time): ${money(summary.revenue)}`,
    `Net profit (revenue − COGS − operating expenses): ${money(summary.netProfit)} (margin ${summary.margin}%)`,
    `Operating expenses: ${money(summary.opex)}; cost of goods sold: ${money(summary.cogs)}`,
    `Sales recorded: ${summary.salesCount}; customers: ${summary.customers}; products: ${summary.products}`,
    `Month-over-month revenue growth: ${summary.growth === null ? "n/a (no prior-month revenue)" : summary.growth.toFixed(1) + "%"}`,
  ].join("\n");

  const key = process.env.OPENAI_API_KEY;
  if (key) {
    // Server-side LLM call only — the key never reaches the browser.
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are the NEXORA AI Business Copilot. Answer using ONLY the business facts provided. Do not invent numbers. If the facts do not cover the question, say so. Keep answers concise and in the user's language.",
            },
            { role: "user", content: `Business facts:\n${facts}\n\nQuestion: ${parsed.data.question}` },
          ],
          temperature: 0.2,
        }),
      });
      if (!res.ok) {
        return NextResponse.json({ error: "AI provider returned an error.", source: "llm-error" }, { status: 502 });
      }
      const data = await res.json();
      const answer = data?.choices?.[0]?.message?.content ?? "";
      return NextResponse.json({ answer, source: "ai-generated", facts });
    } catch {
      return NextResponse.json({ error: "AI provider unreachable.", source: "llm-error" }, { status: 502 });
    }
  }

  // No LLM key: a calculated summary from real DB aggregates — clearly labelled.
  const answer = [
    "Calculated summary — no LLM key configured (set OPENAI_API_KEY for AI-generated answers).",
    "",
    `Your business has recorded ${summary.salesCount} sales across ${summary.customers} customers and ${summary.products} products.`,
    `Total revenue is ${money(summary.revenue)}; after cost of goods sold (${money(summary.cogs)}) and operating expenses (${money(summary.opex)}), net profit is ${money(summary.netProfit)} — a ${summary.margin}% net margin.`,
    summary.growth === null
      ? "Month-over-month growth cannot be computed yet (no prior-month revenue)."
      : `Revenue ${summary.growth >= 0 ? "grew" : "fell"} ${Math.abs(summary.growth).toFixed(1)}% versus last month.`,
    "Open the Decisions page for data-driven recommendations, or the Optimization page to allocate budget for maximum expected return.",
  ].join("\n");
  return NextResponse.json({ answer, source: "calculated", facts });
}
