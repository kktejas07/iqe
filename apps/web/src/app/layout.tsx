import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "@/components/LayoutWrapper";

// Self-hosted at build time: no layout shift, no render-blocking Google Fonts
// request. Roboto throughout, with the heavier weights carrying the headings —
// one family reads as one system, and the medium weight is what the interface
// is set in.
//
// Every consumer of these variables supplies a sans-serif fallback *inside*
// var(), not after it. `font-family: var(--font-body), sans-serif` looks like
// it degrades safely and does not: an undefined custom property makes the
// whole declaration invalid at computed-value time, the browser falls back to
// its own default, and the entire application renders in Times New Roman.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-inter",
  display: "swap",
});
const robotoHeading = Roboto({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-heading",
  display: "swap",
});
const mono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

// Kept under the previous names so the hundreds of existing `font-sans` /
// `font-heading` call sites do not all have to change.
const inter = roboto;
const jakarta = robotoHeading;

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
