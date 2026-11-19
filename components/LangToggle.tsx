"use client";

import { useRouter } from "next/navigation";

export function LangToggle({ lang }: { lang: "ar" | "en" }) {
  const router = useRouter();
  const switchTo = lang === "ar" ? "en" : "ar";
  return (
    <button
      onClick={() => {
        document.cookie = `nx-lang=${switchTo}; path=/; max-age=31536000`;
        router.refresh();
      }}
      className="rounded-lg border border-[#142B55] bg-[#0D1B2D] px-3 py-1.5 text-sm font-semibold text-[#80B8FF] hover:border-[#2878FF]"
      aria-label="Switch language / تغيير اللغة"
    >
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}
