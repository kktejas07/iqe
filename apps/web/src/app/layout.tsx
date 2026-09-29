import type { Metadata } from "next";
import "./globals.css";
import { LayoutWrapper } from "@/components/LayoutWrapper";

export const metadata: Metadata = {
  title: "IQEApp — Ideal Quality Engineers",
  description: "Ideal Quality Engineers — AI-Powered Quality & Inspection System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans bg-slate-50 antialiased text-slate-800">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
