// Minimal bilingual dictionary. Arabic is the default (user preference).
// The language cookie `nx-lang` ("ar" | "en") drives dir/lang in layout.

export type Lang = "ar" | "en";

export const dict = {
  en: {
    tagline: "Turn Business Data Into Decisions.",
    dashboard: "Dashboard",
    sales: "Sales",
    inventory: "Inventory",
    customers: "Customers",
    marketing: "Marketing",
    finance: "Finance",
    optimization: "Optimization",
    copilot: "AI Copilot",
    decisions: "Decisions",
    reports: "Reports",
    settings: "Settings",
    admin: "Admin",
    logout: "Sign out",
    login: "Sign in",
    demoData: "Demo data",
    demoDataNote:
      "These figures come from the labelled demo dataset, not your real business. Import your own data to replace them.",
    totalRevenue: "Total Revenue",
    netProfit: "Net Profit",
    operatingCosts: "Operating Costs",
    salesGrowth: "Sales Growth",
    customerAcquisition: "Customer Acquisition",
    conversionRate: "Conversion Rate",
    retention: "Customer Retention",
    performanceScore: "Business Performance Score",
    revenueTrend: "Revenue Trend",
    monthlyComparison: "Monthly Comparison",
    dbNotConfigured:
      "Database not configured — set DATABASE_URL in .env, run `npx prisma db push` and `npm run db:seed`, then reload.",
  },
  ar: {
    tagline: "حوّل بيانات أعمالك إلى قرارات.",
    dashboard: "لوحة التحكم",
    sales: "المبيعات",
    inventory: "المخزون",
    customers: "العملاء",
    marketing: "التسويق",
    finance: "المالية",
    optimization: "التحسين",
    copilot: "مساعد الذكاء الاصطناعي",
    decisions: "القرارات",
    reports: "التقارير",
    settings: "الإعدادات",
    admin: "الإدارة",
    logout: "تسجيل الخروج",
    login: "تسجيل الدخول",
    demoData: "بيانات تجريبية",
    demoDataNote:
      "هذه الأرقام من مجموعة بيانات تجريبية موسومة، وليست بيانات عملك الحقيقية. استورد بياناتك لاستبدالها.",
    totalRevenue: "إجمالي الإيرادات",
    netProfit: "صافي الربح",
    operatingCosts: "تكاليف التشغيل",
    salesGrowth: "نمو المبيعات",
    customerAcquisition: "اكتساب العملاء",
    conversionRate: "معدل التحويل",
    retention: "الاحتفاظ بالعملاء",
    performanceScore: "مؤشر أداء الأعمال",
    revenueTrend: "اتجاه الإيرادات",
    monthlyComparison: "المقارنة الشهرية",
    dbNotConfigured:
      "قاعدة البيانات غير مُعدّة — عيّن DATABASE_URL في .env ثم نفّذ `npx prisma db push` و `npm run db:seed` وأعد التحميل.",
  },
} as const;

export type Dict = Record<keyof (typeof dict)["en"], string>;

export function getDict(lang: Lang): Dict {
  return dict[lang] as unknown as Dict;
}

export function getLangFromCookie(cookieHeader: string | undefined): Lang {
  return cookieHeader?.includes("nx-lang=en") ? "en" : "ar";
}
