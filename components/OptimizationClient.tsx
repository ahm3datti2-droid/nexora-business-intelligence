"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

type Channel = { name: string; roi: number; min: number; max: number };

const DEFAULTS: Channel[] = [
  { name: "Google Ads", roi: 3.0, min: 5000, max: 30000 },
  { name: "Meta Ads", roi: 1.9, min: 5000, max: 25000 },
  { name: "LinkedIn", roi: 1.2, min: 2000, max: 15000 },
  { name: "Email", roi: 7.0, min: 1000, max: 8000 },
];

type Result = {
  status: string;
  allocation: number[];
  objectiveValue: number;
  baselineValue: number;
  improvement: number;
  totalBudget: number;
  totalAllocated: number;
  iterations: number;
  proof: string;
  variables: (Channel & { value: number })[];
  model: { decisionVariables: string[]; objectiveFunction: string; constraints: string[]; solver: string };
};

export default function OptimizationClient() {
  const [budget, setBudget] = useState(50000);
  const [channels, setChannels] = useState<Channel[]>(DEFAULTS);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function setChannel(i: number, patch: Partial<Channel>) {
    setChannels((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }

  async function run() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalBudget: budget, channels }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Optimization failed.");
      return;
    }
    setResult(data);
  }

  return (
    <>
      <h1 className="text-2xl font-black">Optimization Center</h1>
      <p className="mt-1 text-sm text-[#8B9BB2]">
        Budget allocation by linear programming. The solver proves optimality — it never claims optimal without proof.
        Default ROI values come from the demo campaigns (Marketing page); edit them to match your measured returns.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Model inputs">
          <label className="block text-sm font-medium">Total budget (EGP)</label>
          <input type="number" min={1} value={budget} onChange={(e) => setBudget(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[#142B55] bg-[#07111F] px-3 py-2 text-white" />
          <table className="mt-4 w-full text-sm">
            <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Channel</th><th className="text-end">ROI (x)</th><th className="text-end">Min</th><th className="text-end">Max</th></tr></thead>
            <tbody>
              {channels.map((c, i) => (
                <tr key={c.name} className="border-t border-[#142B55]">
                  <td className="py-2 font-medium">{c.name}</td>
                  <td><input type="number" step="0.1" min={0} value={c.roi} onChange={(e) => setChannel(i, { roi: Number(e.target.value) })} className="w-20 rounded border border-[#142B55] bg-[#07111F] px-2 py-1 text-end" /></td>
                  <td><input type="number" min={0} value={c.min} onChange={(e) => setChannel(i, { min: Number(e.target.value) })} className="w-24 rounded border border-[#142B55] bg-[#07111F] px-2 py-1 text-end" /></td>
                  <td><input type="number" min={0} value={c.max} onChange={(e) => setChannel(i, { max: Number(e.target.value) })} className="w-24 rounded border border-[#142B55] bg-[#07111F] px-2 py-1 text-end" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={run} disabled={loading} className="mt-4 w-full rounded-lg bg-[#2878FF] py-2.5 font-semibold text-white disabled:opacity-50">
            {loading ? "Solving…" : "Solve — maximize expected return"}
          </button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </Card>

        <Card title="Solution">
          {!result ? (
            <p className="text-sm text-[#8B9BB2]">Run the solver to see the allocation, the model definition and the optimality proof.</p>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <span className={`rounded-md px-2 py-1 text-xs font-bold ${result.status === "OPTIMAL" ? "bg-green-500 text-black" : result.status === "INFEASIBLE" ? "bg-red-500 text-white" : "bg-amber-500 text-black"}`}>
                  {result.status}
                </span>
                <p className="mt-2 text-[#8B9BB2]">{result.proof}</p>
              </div>
              <table className="w-full">
                <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">Variable</th><th className="text-end">Allocation</th><th className="text-end">Expected return</th></tr></thead>
                <tbody>
                  {result.variables.map((v) => (
                    <tr key={v.name} className="border-t border-[#142B55]">
                      <td className="py-2">{v.name}</td>
                      <td className="text-end font-bold">{v.value.toLocaleString()} EGP</td>
                      <td className="text-end">{(v.roi * v.value).toLocaleString()} EGP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="rounded-xl border border-[#142B55] p-3">
                <div>Total allocated: <b>{result.totalAllocated.toLocaleString()} / {result.totalBudget.toLocaleString()} EGP</b></div>
                <div>Expected return: <b>{result.objectiveValue.toLocaleString()} EGP</b></div>
                <div>Baseline (minimums only): {result.baselineValue.toLocaleString()} EGP</div>
                <div className="text-[#80B8FF]">Measurable impact: +{result.improvement.toLocaleString()} EGP expected return vs baseline.</div>
                <div className="text-xs text-[#8B9BB2]">Solver iterations: {result.iterations}</div>
              </div>
              <div>
                <div className="font-semibold">Decision variables</div>
                <ul className="list-disc ps-5 text-[#8B9BB2]">{result.model.decisionVariables.map((d) => <li key={d}>{d}</li>)}</ul>
                <div className="mt-2 font-semibold">Objective function</div>
                <p className="text-[#8B9BB2]">{result.model.objectiveFunction}</p>
                <div className="mt-2 font-semibold">Constraints</div>
                <ul className="list-disc ps-5 text-[#8B9BB2]">{result.model.constraints.map((c) => <li key={c}>{c}</li>)}</ul>
                <div className="mt-2 font-semibold">Solver</div>
                <p className="text-[#8B9BB2]">{result.model.solver}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
