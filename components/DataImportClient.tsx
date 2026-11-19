"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

type ImportResult = {
  rowsTotal: number;
  rowsImported: number;
  rowsSkipped: number;
  errors: { row: number; message: string }[];
};

type ImportLog = {
  id: string;
  fileName: string;
  kind: string;
  rowsTotal: number;
  rowsImported: number;
  rowsSkipped: number;
  createdAt: string;
};

const TEMPLATE = `date,product_sku,product_name,customer_name,quantity,unit_price,unit_cost,channel,external_ref
2026-11-19,NX-AN-001,Nexora Analytics Pro,Cairo Retail Group,2,1200,300,online,IMP-0001
2026-11-19,NX-DB-002,Nexora Dashboard Suite,Alexandria Foods,1,850,220,store,IMP-0002`;

export default function DataImportClient({ initialLogs }: { initialLogs: ImportLog[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<ImportLog[]>(initialLogs);

  async function loadLogs() {
    const res = await fetch("/api/import");
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs ?? []);
    }
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/import", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Import failed.");
      return;
    }
    setResult(data);
    loadLogs();
  }

  return (
    <>      <h1 className="text-2xl font-black">Data & CSV Import</h1>
      <p className="mt-1 text-sm text-[#8B9BB2]">
        Import sales from CSV. Rows are validated; duplicates (same external_ref) are skipped and reported; every import is logged below.
        Your first successful import clears the demo-data flag.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Upload sales CSV">
          <p className="mb-3 text-xs text-[#8B9BB2]">
            Required columns: date (YYYY-MM-DD), product_sku, product_name, customer_name, quantity, unit_price, unit_cost, channel, external_ref
          </p>
          <button
            onClick={() => {
              const blob = new Blob([TEMPLATE], { type: "text/csv" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "nexora-sales-template.csv";
              a.click();
            }}
            className="mb-4 rounded-lg bg-[#142B55] px-3 py-2 text-xs font-semibold text-white"
          >
            Download CSV template
          </button>
          <form onSubmit={upload} className="space-y-3">
            <input type="file" accept=".csv,text/csv" required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-[#142B55] bg-[#07111F] px-3 py-2 text-sm text-white" />
            <button disabled={loading || !file} className="w-full rounded-lg bg-[#2878FF] py-2.5 font-semibold text-white disabled:opacity-50">
              {loading ? "Importing…" : "Import CSV"}
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {result && (
            <div className="mt-4 rounded-xl border border-[#142B55] p-3 text-sm">
              <div>Rows: <b>{result.rowsTotal}</b> · Imported: <b className="text-green-400">{result.rowsImported}</b> · Skipped: <b className="text-amber-300">{result.rowsSkipped}</b></div>
              {result.errors.length > 0 && (
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-red-300">
                  {result.errors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
                </ul>
              )}
            </div>
          )}
        </Card>
        <Card title="Import history">
          {logs.length === 0 ? <p className="text-sm text-[#8B9BB2]">No imports yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-[#8B9BB2]"><th className="py-2 text-start">File</th><th className="text-end">Imported</th><th className="text-end">Skipped</th><th className="text-end">Date</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-[#142B55]">
                    <td className="py-2">{l.fileName}</td>
                    <td className="text-end">{l.rowsImported}/{l.rowsTotal}</td>
                    <td className="text-end">{l.rowsSkipped}</td>
                    <td className="text-end">{new Date(l.createdAt).toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
