import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { solveBudgetAllocation } from "@/lib/optimizer";

const channelSchema = z.object({
  name: z.string().min(1).max(80),
  roi: z.number().min(0).max(100),
  min: z.number().min(0),
  max: z.number().min(0),
});

const schema = z.object({
  totalBudget: z.number().positive().max(1_000_000_000),
  channels: z.array(channelSchema).min(1).max(12),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid optimization input.", details: parsed.error.flatten() }, { status: 400 });
  }
  const result = solveBudgetAllocation(parsed.data.channels, parsed.data.totalBudget);
  return NextResponse.json({
    ...result,
    model: {
      decisionVariables: parsed.data.channels.map((c) => `x_${c.name} = budget for ${c.name}`),
      objectiveFunction: `maximise sum(roi_i * x_i)`,
      constraints: [
        `sum(x_i) <= ${parsed.data.totalBudget} (total budget)`,
        ...parsed.data.channels.map((c) => `${c.min} <= x_${c.name} <= ${c.max}`),
      ],
      solver: "NEXORA TypeScript primal simplex (Bland's rule) — default engine. Python OR-Tools service in analytics/ is optional.",
    },
  });
}
