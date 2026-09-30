import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "@/components/LayoutWrapper";

// Self-hosted at build time: no layout shift, no render-blocking Google Fonts request
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "IQEApp — Ideal Quality Engineers",
  description: "Ideal Quality Engineers — AI-Powered Quality & Inspection System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans bg-slate-50 antialiased text-slate-800">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
