"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/";

  if (isAuthPage) {
    return <main className="min-h-screen bg-slate-950 text-slate-100">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 sm:p-5 md:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
