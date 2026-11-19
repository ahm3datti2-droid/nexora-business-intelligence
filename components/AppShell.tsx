import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { LangToggle } from "./LangToggle";
import { cookies } from "next/headers";

const NAV = [
  { href: "/dashboard", en: "Dashboard", ar: "لوحة التحكم" },
  { href: "/sales", en: "Sales", ar: "المبيعات" },
  { href: "/inventory", en: "Inventory", ar: "المخزون" },
  { href: "/customers", en: "Customers", ar: "العملاء" },
  { href: "/marketing", en: "Marketing", ar: "التسويق" },
  { href: "/finance", en: "Finance", ar: "المالية" },
  { href: "/optimization", en: "Optimization", ar: "التحسين" },
  { href: "/copilot", en: "AI Copilot", ar: "مساعد الذكاء" },
  { href: "/decisions", en: "Decisions", ar: "القرارات" },
  { href: "/reports", en: "Reports", ar: "التقارير" },
  { href: "/settings", en: "Settings", ar: "الإعدادات" },
];

export async function AppShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: string;
}) {
  const user = await getSessionUser();
  const jar = await cookies();
  const lang = jar.get("nx-lang")?.value === "en" ? "en" : "ar";
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-e border-[#142B55] bg-[#0D1B2D] p-4 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-baseline gap-2 px-2">
          <span className="text-2xl font-black tracking-tight text-white">
            NEX<span className="text-[#2878FF]">ORA</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                active === item.href
                  ? "bg-[#142B55] text-white"
                  : "text-[#8B9BB2] hover:bg-[#142B55]/60 hover:text-white"
              }`}
            >
              {lang === "ar" ? item.ar : item.en}
            </Link>
          ))}
          {user?.role === "SUPER_ADMIN" && (
            <Link
              href="/admin"
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                active === "/admin" ? "bg-[#142B55] text-white" : "text-[#8B9BB2] hover:text-white"
              }`}
            >
              {lang === "ar" ? "الإدارة العليا" : "Super Admin"}
            </Link>
          )}
        </nav>
        <div className="mt-auto rounded-xl border border-[#142B55] p-3 text-xs text-[#8B9BB2]">
          <div className="font-semibold text-white">{user?.name}</div>
          <div>{user?.email}</div>
          <div className="mt-1 text-[#80B8FF]">{user?.role}</div>
          <form action="/api/auth/logout" method="post" className="mt-3">
            <button className="w-full rounded-lg bg-[#142B55] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2878FF]">
              {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#142B55] bg-[#07111F]/95 px-4 py-3 backdrop-blur md:px-6">
          <Link href="/dashboard" className="text-xl font-black md:hidden">
            NEX<span className="text-[#2878FF]">ORA</span>
          </Link>
          <nav className="flex gap-1 overflow-x-auto md:hidden">
            {NAV.slice(0, 6).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-lg bg-[#0D1B2D] px-3 py-1.5 text-xs text-[#8B9BB2]"
              >
                {lang === "ar" ? item.ar : item.en}
              </Link>
            ))}
          </nav>
          <div className="ms-auto">
            <LangToggle lang={lang} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
