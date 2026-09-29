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
  ChevronDown,
  Shield,
  FileSpreadsheet,
  CheckSquare,
  Pill,
  Layers,
  PanelLeftClose,
  PanelLeft,
  Compass,
  Zap,
  PackageCheck,
} from "@/components/icons";

interface SidebarProps {
  isCollapsed?: boolean;
  toggleSidebar?: () => void;
  theme?: string;
}

interface SubModuleItem {
  name: string;
  subtitle: string;
  href: string;
  icon: any;
  color: string;
}

const formatsSubModules: SubModuleItem[] = [
  {
    name: "Flash Inspection",
    subtitle: "Quick Day Summary (IQE-TP-02)",
    href: "/flash-inspection-report",
    icon: Zap,
    color: "text-amber-600 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
  },
  {
    name: "Inspection Visit",
    subtitle: "Complete Visit Report (IQE-TP-03)",
    href: "/inspection-visit-report",
    icon: FileSpreadsheet,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800/40",
  },
  {
    name: "Inspection Release (IRN)",
    subtitle: "Dispatch Clearance (IQE-TP-04)",
    href: "/inspection-release-note",
    icon: PackageCheck,
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
  },
  {
    name: "Expediting Report",
    subtitle: "Vendor Visit & Fab (IQE-TP-05)",
    href: "/expediting-visit-report",
    icon: Compass,
    color: "text-teal-600 bg-teal-100 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200 dark:border-teal-800/40",
  },
  {
    name: "Bill Verification",
    subtitle: "RA Bills & TPI Billing",
    href: "/tpi-billing",
    icon: FileSpreadsheet,
    color: "text-[#0084bf] bg-sky-100 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200 dark:border-sky-800/40",
  },
  {
    name: "BOQ Reconciliation",
    subtitle: "Material & Quantity Audit",
    href: "/boq-reconciliation",
    icon: Layers,
    color: "text-purple-600 bg-purple-100 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800/40",
  },
  {
    name: "Quality Verification",
    subtitle: "Concealed Work & ISO 17020",
    href: "/quality-bill-verification",
    icon: ShieldCheck,
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
  },
  {
    name: "Mpharma EPC",
    subtitle: "Formats F-01 to F-12",
    href: "/schedule-m-pharma-epc",
    icon: Pill,
    color: "text-[#e35f14] bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
  },
];

const sopsSubModules: SubModuleItem[] = [
  {
    name: "SOP Library",
    subtitle: "SOP-01 to SOP-08 Manuals",
    href: "/sops",
    icon: FileText,
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
  },
  {
    name: "TPI Process Flow",
    subtitle: "RFQ to Certificate Workflow",
    href: "/tpi-process-flow",
    icon: Sparkles,
    color: "text-teal-600 bg-teal-100 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200 dark:border-teal-800/40",
  },
];

const generalNavItems = [
  { name: "Assessments", href: "/jobs", icon: Briefcase },
  { name: "Visits", href: "/visits", icon: CalendarCheck },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Clients", href: "/clients", icon: Building2 },
  { name: "Manufacturers", href: "/manufacturers", icon: Factory },
  { name: "Service Orders", href: "/service-orders", icon: ClipboardList },
  { name: "Admin System", href: "/admin", icon: ShieldCheck },
];

export function Sidebar({ isCollapsed, toggleSidebar, theme }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("user");
  const [userName, setUserName] = useState<string>("TPI Engineer");
  const [formatsOpen, setFormatsOpen] = useState<boolean>(true);
  const [sopsOpen, setSopsOpen] = useState<boolean>(true);

  const isFormatsActive =
    pathname.startsWith("/flash-inspection-report") ||
    pathname.startsWith("/inspection-visit-report") ||
    pathname.startsWith("/inspection-release-note") ||
    pathname.startsWith("/expediting-visit-report") ||
    pathname.startsWith("/boq-reconciliation") ||
    pathname.startsWith("/tpi-billing") ||
    pathname.startsWith("/quality-bill-verification") ||
    pathname.startsWith("/schedule-m-pharma-epc");

  const isSopsActive =
    pathname.startsWith("/sops") ||
    pathname.startsWith("/tpi-process-flow");

  const isWorkInstructionsActive = pathname.startsWith("/work-instructions");
  const isQualityPlansActive = pathname.startsWith("/itps");

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
    <aside
      className={`${
        isCollapsed ? "w-20" : "w-64"
      } bg-[#001a2c] border-r border-slate-800/80 flex flex-col justify-between min-h-screen text-slate-300 select-none flex-shrink-0 transition-all duration-300 z-40`}
    >
      <div>
        {/* Brand Header */}
        <div className={`p-4 border-b border-slate-800/80 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0084bf] to-[#e35f14] flex items-center justify-center text-white shadow-md glow-iqe-blue group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div>
                <span className="font-heading text-lg font-bold tracking-tight text-white block">
                  IQEApp
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#e35f14] font-semibold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-[#0084bf]" /> Inspection AI
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Active Role Indicator */}
        {!isCollapsed && (
          <div className="mx-3 mt-4 p-3 rounded-2xl bg-gradient-to-br from-[#002b48] to-[#001a2c] border border-[#0084bf]/40 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <CheckSquare className="w-4 h-4 text-[#e35f14] shrink-0" />
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">TPI Verification Engine</p>
                <p className="text-[10px] text-sky-200/70 truncate">ISO & BOQ Compliance</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase shrink-0 ${badge.color}`}>
              {role}
            </span>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5 mt-3">
          {!isCollapsed && (
            <p className="px-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
              Main Navigation
            </p>
          )}

          {/* Dashboard Item */}
          <Link
            href="/dashboard"
            title={isCollapsed ? "Dashboard" : undefined}
            className={`flex items-center ${
              isCollapsed ? "justify-center px-2" : "justify-between px-3.5"
            } py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
              pathname === "/dashboard"
                ? "bg-gradient-to-r from-[#0084bf] to-[#00618e] text-white shadow-md glow-iqe-blue font-semibold border border-sky-400/30"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard
                className={`w-4 h-4 shrink-0 transition-colors ${
                  pathname === "/dashboard" ? "text-white" : "text-slate-400 group-hover:text-[#0084bf]"
                }`}
              />
              {!isCollapsed && <span className="truncate">Dashboard</span>}
            </div>
            {!isCollapsed && pathname === "/dashboard" && <ChevronRight className="w-4 h-4 text-[#e35f14] shrink-0" />}
          </Link>

          {/* MAIN TITLE 1: FORMATS */}
          <div className="pt-1">
            <button
              onClick={() => setFormatsOpen(!formatsOpen)}
              title={isCollapsed ? "Formats" : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center px-2" : "justify-between px-3.5"
              } py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                isFormatsActive
                  ? "bg-[#0084bf]/20 text-sky-300 border border-[#0084bf]/40"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-[#0084bf] shrink-0" />
                {!isCollapsed && <span className="truncate uppercase tracking-wider text-[11px]">Formats</span>}
              </div>
              {!isCollapsed && (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    formatsOpen ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {/* Formats Sub-items */}
            {(!isCollapsed && formatsOpen) && (
              <div className="mt-1 pl-2.5 pr-1 space-y-1.5 border-l-2 border-[#0084bf]/30 ml-4 py-1">
                {formatsSubModules.map((item) => {
                  const SubIcon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-[#0084bf] to-[#00618e] text-white font-bold shadow-xs border border-sky-400/30"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${isActive ? "bg-white/20 text-white border-white/30" : item.color}`}>
                        <SubIcon className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="truncate font-semibold text-xs leading-tight">
                          {item.name}
                        </div>
                        <div className={`text-[9px] truncate leading-tight ${isActive ? "text-sky-200" : "text-slate-400"}`}>
                          {item.subtitle}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* MAIN TITLE 2: SOPS */}
          <div className="pt-1">
            <button
              onClick={() => setSopsOpen(!sopsOpen)}
              title={isCollapsed ? "SOPs" : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center px-2" : "justify-between px-3.5"
              } py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                isSopsActive
                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                {!isCollapsed && <span className="truncate uppercase tracking-wider text-[11px]">SOPs</span>}
              </div>
              {!isCollapsed && (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    sopsOpen ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {/* SOPs Sub-items */}
            {(!isCollapsed && sopsOpen) && (
              <div className="mt-1 pl-2.5 pr-1 space-y-1.5 border-l-2 border-emerald-500/30 ml-4 py-1">
                {sopsSubModules.map((item) => {
                  const SubIcon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold shadow-xs border border-emerald-400/30"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${isActive ? "bg-white/20 text-white border-white/30" : item.color}`}>
                        <SubIcon className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="truncate font-semibold text-xs leading-tight">
                          {item.name}
                        </div>
                        <div className={`text-[9px] truncate leading-tight ${isActive ? "text-emerald-200" : "text-slate-400"}`}>
                          {item.subtitle}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* MAIN TITLE 3: WORK INSTRUCTIONS */}
          <div className="pt-1">
            <Link
              href="/work-instructions"
              title={isCollapsed ? "Work Instructions" : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center px-2" : "justify-between px-3.5"
              } py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                isWorkInstructionsActive
                  ? "bg-gradient-to-r from-amber-600 to-[#e35f14] text-white shadow-xs border border-amber-400/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                {!isCollapsed && <span className="truncate uppercase tracking-wider text-[11px]">Work Instructions</span>}
              </div>
              {!isCollapsed && isWorkInstructionsActive && <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />}
            </Link>
          </div>

          {/* MAIN TITLE 4: QUALITY PLANS */}
          <div className="pt-1">
            <Link
              href="/itps"
              title={isCollapsed ? "Quality Plans" : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center px-2" : "justify-between px-3.5"
              } py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                isQualityPlansActive
                  ? "bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-xs border border-purple-400/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                {!isCollapsed && <span className="truncate uppercase tracking-wider text-[11px]">Quality Plans</span>}
              </div>
              {!isCollapsed && isQualityPlansActive && <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />}
            </Link>
          </div>

          {/* General Nav Items */}
          {generalNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center ${
                  isCollapsed ? "justify-center px-2" : "justify-between px-3.5"
                } py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-[#0084bf] to-[#00618e] text-white shadow-md glow-iqe-blue font-semibold border border-sky-400/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-[#0084bf]"
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </div>
                {!isCollapsed && isActive && <ChevronRight className="w-4 h-4 text-[#e35f14] shrink-0" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-slate-800/80">
        {!isCollapsed && (
          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0084bf] to-[#e35f14] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {role.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate capitalize">{userName}</p>
                <p className="text-[10px] text-slate-400 truncate">{badge.label}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          title={isCollapsed ? "Sign Out" : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center" : "justify-center"
          } gap-2 px-3 py-2 rounded-full text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 border border-transparent hover:border-rose-800/40 transition-all duration-200`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

