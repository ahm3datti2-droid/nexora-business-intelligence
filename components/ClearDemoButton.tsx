"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClearDemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function clear() {
    if (!confirm("Clear all demo data for this workspace? This cannot be undone.")) return;
    setBusy(true);
    const res = await fetch("/api/demo/clear", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    }
  }
  if (done) return <span className="text-sm font-semibold text-green-400">Demo data cleared.</span>;
  return (
    <button onClick={clear} disabled={busy} className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 disabled:opacity-50">
      {busy ? "Clearing…" : "Clear demo data"}
    </button>
  );
}
