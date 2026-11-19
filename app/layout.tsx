import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });

export const metadata: Metadata = {
  title: "NEXORA Business Intelligence — Turn Business Data Into Decisions",
  description:
    "Enterprise Business Intelligence, predictive analytics, mathematical optimization and AI decision support — in Arabic and English.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const lang = jar.get("nx-lang")?.value === "en" ? "en" : "ar";
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body
        className={`${inter.variable} ${cairo.variable} bg-[#07111F] text-[#F4F7FC] antialiased`}
        style={{ fontFamily: "'Inter','Cairo',sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
