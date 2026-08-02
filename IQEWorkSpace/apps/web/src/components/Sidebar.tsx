"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  CalendarCheck,
  FileText,
  Building2,
  Factory,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  LogOut,
  ChevronRight,
  Shield,
  FileSpreadsheet,
  CheckSquare,
} from "lucide-react";
import { api } from "@/lib/api";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "TPI Bill Verification", href: "/tpi-billing", icon: FileSpreadsheet },
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "Visits", href: "/visits", icon: CalendarCheck },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Clients", href: "/clients", icon: Building2 },
  { name: "Manufacturers", href: "/manufacturers", icon: Factory },
  { name: "Service Orders", href: "/service-orders", icon: ClipboardList },
  { name: "Admin System", href: "/admin", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("user");
  const [userName, setUserName] = useState<string>("TPI Engineer");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const r = localStorage.getItem("user_role") || "user";
      const u = localStorage.getItem("user_name") || "TPI Engineer";
      setRole(r);
      setUserName(u);
    }
  }, [pathname]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    router.push("/login");
  };

  const getRoleBadge = () => {
    if (role === "admin") return { label: "Admin Mode", color: "bg-purple-950 text-purple-300 border-purple-800" };
    if (role === "tenant") return { label: "Tenant Client", color: "bg-blue-950 text-blue-300 border-blue-800" };
    return { label: "TPI Engineer", color: "bg-emerald-950 text-emerald-300 border-emerald-800" };
  };

  const badge = getRoleBadge();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between min-h-screen text-slate-300 select-none flex-shrink-0">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl gradient-indigo-blue flex items-center justify-center text-white shadow-lg glow-indigo group-hover:scale-105 transition-transform duration-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-heading text-lg font-bold tracking-tight text-white block">
                IQEApp
              </span>
              <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Inspection AI
              </span>
            </div>
          </Link>
        </div>

        {/* Active Role Indicator */}
        <div className="mx-3 mt-4 p-3 rounded-xl bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">TPI Verification Engine</p>
              <p className="text-[10px] text-slate-400 truncate">ISO & BOQ Compliance</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border uppercase shrink-0 ${badge.color}`}>
            {role}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 mt-3">
          <p className="px-3 text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">
            Main Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md glow-indigo font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-400"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-indigo-200" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {role.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate capitalize">{userName}</p>
              <p className="text-[10px] text-slate-400 truncate">{badge.label}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 border border-transparent hover:border-rose-800/40 transition-all duration-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
