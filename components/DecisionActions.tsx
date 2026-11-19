"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DecisionActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(next: string) {
    setBusy(true);
    await fetch(`/api/decisions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  if (status !== "PENDING") {
    return <span className="text-xs font-bold text-[#80B8FF]">{status}</span>;
  }
  return (
    <div className="flex gap-2">
      <button onClick={() => act("APPROVED")} disabled={busy} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Approve</button>
      <button onClick={() => act("ASSIGNED")} disabled={busy} className="rounded-lg bg-[#2878FF] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Assign to me</button>
      <button onClick={() => act("REJECTED")} disabled={busy} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Reject</button>
    </div>
  );
}
