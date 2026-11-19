"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-[#142B55] px-4 py-2 text-sm font-semibold text-white"
    >
      Print
    </button>
  );
}
