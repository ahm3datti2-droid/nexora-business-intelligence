import Link from "next/link";
import { cookies } from "next/headers";
import { LangToggle } from "@/components/LangToggle";

const FEATURES = [
  { en: "Executive Dashboard", ar: "لوحة تنفيذية", dEn: "Revenue, profit, growth and a performance score — all computed from your real data.", dAr: "الإيرادات والأرباح والنمو ومؤشر أداء — كلها محسوبة من بياناتك الحقيقية." },
  { en: "Sales & Inventory Intelligence", ar: "ذكاء المبيعات والمخزون", dEn: "Product performance, low-stock alerts, dead-stock detection and demand signals.", dAr: "أداء المنتجات وتنبيهات نقص المخزون ورصد الراكد وإشارات الطلب." },
  { en: "Customer Intelligence", ar: "ذكاء العملاء", dEn: "Segmentation, lifetime value, retention and churn-risk flags.", dAr: "تقسيم العملاء والقيمة الدائمة والاحتفاظ ومؤشرات خطر التسرّب." },
  { en: "Optimization Engine", ar: "محرك التحسين الرياضي", dEn: "Real linear-programming allocation — optimal, feasible or infeasible, never faked.", dAr: "تخصيص ببرمجة خطية حقيقية — مثالي أو ممكن أو غير ممكن، بلا نتائج مزيفة." },
  { en: "AI Business Copilot", ar: "مساعد الأعمال الذكي", dEn: "Answers about your business from your authorized data, clearly labelled.", dAr: "يجيب عن أسئلة عملك من بياناتك المصرّح بها، مع وسم واضح للمصدر." },
  { en: "Decision Intelligence", ar: "ذكاء القرارات", dEn: "Recommendations with problem, evidence, impact, risk and confidence — approve or reject.", dAr: "توصيات بالمشكلة والدليل والأثر والمخاطر والثقة — وافق أو ارفض." },
];

const PLANS = [
  { name: "STARTER", price: "Free", en: "Basic business analytics.", ar: "تحليلات أعمال أساسية.", feats: ["Executive dashboard", "Sales & inventory", "CSV import"] },
  { name: "PROFESSIONAL", price: "Free", en: "Advanced analytics, reports and forecasting.", ar: "تحليلات متقدمة وتقارير وتنبؤ.", feats: ["Everything in Starter", "AI Copilot", "Decision center", "Scheduled reports"] },
  { name: "ENTERPRISE", price: "Free", en: "Optimization, AI, integrations and org management.", ar: "تحسين وذكاء اصطناعي وتكاملات وإدارة مؤسسات.", feats: ["Everything in Professional", "Optimization engine", "API integrations", "Super admin panel"] },
];

export default async function LandingPage() {
  const jar = await cookies();
  const lang = jar.get("nx-lang")?.value === "en" ? "en" : "ar";
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="text-2xl font-black">NEX<span className="text-[#2878FF]">ORA</span></div>
        <div className="flex items-center gap-3">
          <LangToggle lang={lang} />
          <Link href="/login" className="rounded-lg bg-[#2878FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e63d6]">
            {t("Sign in", "تسجيل الدخول")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <section className="py-16 text-center md:py-24">
          <h1 className="text-4xl font-black leading-tight md:text-6xl">
            {t("Turn Business Data", "حوّل بيانات أعمالك")}
            <br />
            <span className="text-[#2878FF]">{t("Into Decisions.", "إلى قرارات.")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[#8B9BB2]">
            {t(
              "Enterprise Business Intelligence, predictive analytics, mathematical optimization and an AI copilot — built on your real data, never on fake numbers.",
              "ذكاء أعمال مؤسسي وتحليلات تنبؤية وتحسين رياضي ومساعد ذكاء اصطناعي — مبني على بياناتك الحقيقية، لا على أرقام مزيفة."
            )}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="rounded-xl bg-[#2878FF] px-6 py-3 font-semibold text-white hover:bg-[#1e63d6]">
              {t("Start free — create your workspace", "ابدأ مجاناً — أنشئ مساحة عملك")}
            </Link>
            <Link href="/login" className="rounded-xl border border-[#142B55] bg-[#0D1B2D] px-6 py-3 font-semibold text-white">
              {t("Sign in", "تسجيل الدخول")}
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.en} className="rounded-2xl border border-[#142B55] bg-[#0D1B2D] p-5">
              <h3 className="font-bold text-white">{lang === "ar" ? f.ar : f.en}</h3>
              <p className="mt-2 text-sm text-[#8B9BB2]">{lang === "ar" ? f.dAr : f.dEn}</p>
            </div>
          ))}
        </section>

        <section className="py-16">
          <h2 className="text-center text-3xl font-black">{t("Plans", "الباقات")}</h2>
          <p className="mt-3 text-center text-sm text-[#8B9BB2]">
            {t("Free for everyone during the launch period — paid plans start later.", "مجاني للجميع خلال فترة الإطلاق — الباقات المدفوعة تبدأ لاحقاً.")}
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className="rounded-2xl border border-[#142B55] bg-[#0D1B2D] p-6">
                <div className="text-sm font-bold tracking-widest text-[#80B8FF]">{p.name}</div>
                <div className="mt-2 text-3xl font-black">{p.price}</div>
                <p className="mt-2 text-sm text-[#8B9BB2]">{lang === "ar" ? p.ar : p.en}</p>
                <ul className="mt-4 space-y-2 text-sm text-[#F4F7FC]">
                  {p.feats.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-[#8B9BB2]">
            {t("Payments are not wired in Phase 1 — no fake payment confirmations. Subscription status is tracked in the data model.", "الدفع غير مربوط في المرحلة الأولى — بلا تأكيدات دفع مزيفة. حالة الاشتراك مسجلة في نموذج البيانات.")}
          </p>
        </section>

        <footer className="border-t border-[#142B55] py-8 text-center text-sm text-[#8B9BB2]">
          NEXORA Business Intelligence — {t("Turn Business Data Into Decisions.", "حوّل بيانات أعمالك إلى قرارات.")}
        </footer>
      </main>
    </div>
  );
}
