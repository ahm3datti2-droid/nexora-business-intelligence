export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#142B55] bg-[#0D1B2D] p-4">
      <div className="text-xs font-medium text-[#8B9BB2]">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-[#80B8FF]">{sub}</div>}
    </div>
  );
}

export function DemoBadge({ lang }: { lang: "ar" | "en" }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <span className="rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">
        {lang === "ar" ? "بيانات تجريبية" : "Demo data"}
      </span>
      <span className="text-amber-100/90">
        {lang === "ar"
          ? "هذه الأرقام من مجموعة بيانات تجريبية موسومة، وليست بيانات عملك الحقيقية. استورد بياناتك لاستبدالها."
          : "These figures come from the labelled demo dataset, not your real business. Import your own data to replace them."}
      </span>
      <a href="/settings/data" className="font-semibold text-amber-300 underline">
        {lang === "ar" ? "استيراد البيانات" : "Import your data"}
      </a>
    </div>
  );
}

export function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#142B55] bg-[#0D1B2D] p-4 md:p-5">
      <h2 className="mb-3 text-base font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

export function DbNotConfigured({ lang }: { lang: "ar" | "en" }) {
  return (
    <div className="rounded-2xl border border-[#142B55] bg-[#0D1B2D] p-6 text-sm text-[#8B9BB2]">
      {lang === "ar"
        ? "قاعدة البيانات غير مُعدّة — عيّن DATABASE_URL في .env ثم نفّذ `npx prisma db push` و `npm run db:seed` وأعد التحميل."
        : "Database not configured — set DATABASE_URL in .env, run `npx prisma db push` and `npm run db:seed`, then reload."}
    </div>
  );
}
