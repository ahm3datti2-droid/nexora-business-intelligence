// NEXORA Optimization Engine — TypeScript (default engine; the Python
// FastAPI + OR-Tools service in analytics/ is an optional alternative).
//
// Problem: budget allocation across marketing channels.
//   Decision variables:  x_i = budget allocated to channel i
//   Objective:           maximise sum(roi_i * x_i)
//   Constraints:         sum(x_i) <= totalBudget
//                        min_i <= x_i <= max_i   for every channel i
//
// Solver: primal simplex on the standard form
//   maximise c^T y  s.t.  A y <= b, y >= 0, b >= 0
// obtained by substituting y_i = x_i - min_i (so y_i >= 0 and all
// right-hand sides are non-negative when sum(min) <= totalBudget).
// Bland's rule is used for pivot selection to guarantee termination.
// The solver reports OPTIMAL only when the optimality condition holds
// (all reduced costs <= 0 at the final tableau). It never claims
// optimality it has not proven.

export type ChannelInput = {
  name: string;
  /** Expected return per 1 unit of currency spent (e.g. 2.5 = 2.5x). */
  roi: number;
  min: number;
  max: number;
};

export type OptimizationStatus = "OPTIMAL" | "FEASIBLE" | "INFEASIBLE" | "UNBOUNDED";

export type OptimizationResult = {
  status: OptimizationStatus;
  /** Allocation per channel (same order as input). */
  allocation: number[];
  /** Total expected return = sum(roi_i * x_i). */
  objectiveValue: number;
  /** Return from the minimum allocations alone (baseline). */
  baselineValue: number;
  /** Improvement over the baseline, in currency units. */
  improvement: number;
  totalBudget: number;
  totalAllocated: number;
  iterations: number;
  /** Human-readable proof summary. */
  proof: string;
  variables: { name: string; value: number; roi: number; min: number; max: number }[];
};

/**
 * Primal simplex for max c^T y, A y <= b, y >= 0, b >= 0.
 * Returns the optimal y and the number of pivots, or null when unbounded.
 */
function simplex(
  c: number[],
  A: number[][],
  b: number[]
): { y: number[]; objective: number; iterations: number } | null {
  const n = c.length;
  const m = A.length;
  // Tableau rows: m constraints + 1 objective row.
  // Columns: n decision vars + m slack vars + RHS.
  const width = n + m + 1;
  const T: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row = new Array<number>(width).fill(0);
    for (let j = 0; j < n; j++) row[j] = A[i][j];
    row[n + i] = 1; // slack
    row[width - 1] = b[i];
    T.push(row);
  }
  const obj = new Array<number>(width).fill(0);
  for (let j = 0; j < n; j++) obj[j] = -c[j];
  T.push(obj);

  const basis: number[] = Array.from({ length: m }, (_, i) => n + i);
  let iterations = 0;
  const MAX_ITER = 10_000;

  for (;;) {
    // Bland's rule: smallest index with a negative reduced cost enters.
    const last = T[m];
    let enter = -1;
    for (let j = 0; j < n + m; j++) {
      if (last[j] < -1e-9) {
        enter = j;
        break;
      }
    }
    if (enter === -1) {
      // Optimality condition met: all reduced costs >= 0 (tableau stores -c).
      const y = new Array<number>(n).fill(0);
      for (let i = 0; i < m; i++) {
        if (basis[i] < n) y[basis[i]] = T[i][width - 1];
      }
      const objective = c.reduce((s, cj, j) => s + cj * y[j], 0);
      return { y, objective, iterations };
    }
    if (iterations >= MAX_ITER) {
      throw new Error("Simplex exceeded iteration limit — possible cycling.");
    }
    // Minimum-ratio test (Bland tie-break: smallest basis index).
    let leave = -1;
    let bestRatio = Infinity;
    for (let i = 0; i < m; i++) {
      const a = T[i][enter];
      if (a > 1e-9) {
        const ratio = T[i][width - 1] / a;
        if (ratio < bestRatio - 1e-9 || (Math.abs(ratio - bestRatio) <= 1e-9 && (leave === -1 || basis[i] < basis[leave]))) {
          bestRatio = ratio;
          leave = i;
        }
      }
    }
    if (leave === -1) return null; // Unbounded (cannot happen with upper bounds).
    // Pivot on (leave, enter).
    const pivot = T[leave][enter];
    for (let j = 0; j < width; j++) T[leave][j] /= pivot;
    for (let i = 0; i <= m; i++) {
      if (i === leave) continue;
      const factor = T[i][enter];
      if (factor !== 0) {
        for (let j = 0; j < width; j++) T[i][j] -= factor * T[leave][j];
      }
    }
    basis[leave] = enter;
    iterations++;
  }
}

export function solveBudgetAllocation(
  channels: ChannelInput[],
  totalBudget: number
): OptimizationResult {
  const clean = channels.map((ch) => ({
    name: ch.name,
    roi: Number(ch.roi) || 0,
    min: Math.max(0, Number(ch.min) || 0),
    max: Math.max(0, Number(ch.max) || 0),
  }));
  const sumMin = clean.reduce((s, c) => s + c.min, 0);
  const baselineValue = clean.reduce((s, c) => s + c.roi * c.min, 0);

  if (clean.length === 0 || totalBudget <= 0) {
    return emptyResult(clean, totalBudget, baselineValue, "INFEASIBLE", "No channels or no budget provided.");
  }
  if (clean.some((c) => c.max < c.min)) {
    return emptyResult(clean, totalBudget, baselineValue, "INFEASIBLE", "At least one channel has max < min.");
  }
  if (sumMin > totalBudget + 1e-9) {
    return emptyResult(
      clean,
      totalBudget,
      baselineValue,
      "INFEASIBLE",
      `Minimum allocations sum to ${sumMin.toFixed(2)}, which exceeds the budget ${totalBudget.toFixed(2)}. Lower a minimum or raise the budget.`
    );
  }

  // Substitute y_i = x_i - min_i.
  const n = clean.length;
  const c = clean.map((ch) => ch.roi);
  const A: number[][] = [];
  const b: number[] = [];
  A.push(new Array<number>(n).fill(1));
  b.push(totalBudget - sumMin);
  for (let i = 0; i < n; i++) {
    const row = new Array<number>(n).fill(0);
    row[i] = 1;
    A.push(row);
    b.push(clean[i].max - clean[i].min);
  }

  const solved = simplex(c, A, b);
  if (solved === null) {
    return emptyResult(clean, totalBudget, baselineValue, "UNBOUNDED", "Solver detected an unbounded problem (unexpected: upper bounds should prevent this).");
  }

  const allocation = clean.map((ch, i) => ch.min + solved.y[i]);
  const objectiveValue = clean.reduce((s, ch, i) => s + ch.roi * allocation[i], 0);
  const totalAllocated = allocation.reduce((s, v) => s + v, 0);
  return {
    status: "OPTIMAL",
    allocation,
    objectiveValue,
    baselineValue,
    improvement: objectiveValue - baselineValue,
    totalBudget,
    totalAllocated,
    iterations: solved.iterations,
    proof: `Primal simplex (Bland's rule) reached the optimality condition after ${solved.iterations} pivot(s): all reduced costs are <= 0, so no feasible direction can improve the objective. The solution is proven optimal for the stated model.`,
    variables: clean.map((ch, i) => ({ ...ch, value: allocation[i] })),
  };
}

function emptyResult(
  channels: ChannelInput[],
  totalBudget: number,
  baselineValue: number,
  status: OptimizationStatus,
  proof: string
): OptimizationResult {
  return {
    status,
    allocation: channels.map((c) => c.min),
    objectiveValue: baselineValue,
    baselineValue,
    improvement: 0,
    totalBudget,
    totalAllocated: channels.reduce((s, c) => s + c.min, 0),
    iterations: 0,
    proof,
    variables: channels.map((c) => ({ ...c, value: c.min })),
  };
}
