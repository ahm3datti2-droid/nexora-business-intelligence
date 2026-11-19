// Shared analytics helpers — pure functions over Prisma aggregates.
// Every figure on the dashboard is computed from DB rows here or in the
// page server components; nothing is hardcoded.

export function sumDecimal(rows: { amount: number }[]): number {
  return rows.reduce((s, r) => s + r.amount, 0);
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function money(n: number, currency = "EGP"): string {
  return `${currency} ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Last `n` month labels (YYYY-MM) ending at the current month. */
export function lastMonths(n: number): { key: string; label: string; start: Date; end: Date }[] {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const start = addMonths(startOfMonth(now), -i);
    const end = addMonths(start, 1);
    out.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: start.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      start,
      end,
    });
  }
  return out;
}

/**
 * Business Performance Score (0-100), computed from real ratios:
 * 40% revenue growth (vs previous period, clamped), 25% net margin,
 * 20% retention proxy (repeat-customer share), 15% conversion.
 * Returns the score plus the weighted components for transparency.
 */
export function performanceScore(input: {
  growthPct: number | null;
  netMarginPct: number;
  repeatSharePct: number;
  conversionPct: number;
}): { score: number; components: { label: string; value: number; weight: number }[] } {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const growth = clamp(((input.growthPct ?? 0) + 20) * 2.5); // -20% -> 0, +20% -> 100
  const margin = clamp(input.netMarginPct * 2); // 50% margin -> 100
  const repeat = clamp(input.repeatSharePct);
  const conversion = clamp(input.conversionPct * 5); // 20% conv -> 100
  const components = [
    { label: "Revenue growth", value: Math.round(growth), weight: 0.4 },
    { label: "Net margin", value: Math.round(margin), weight: 0.25 },
    { label: "Repeat customers", value: Math.round(repeat), weight: 0.2 },
    { label: "Conversion", value: Math.round(conversion), weight: 0.15 },
  ];
  const score = Math.round(
    components.reduce((s, c) => s + c.value * c.weight, 0)
  );
  return { score, components };
}
