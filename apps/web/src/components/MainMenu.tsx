"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Award, CalendarCheck, Camera, ChevronDown, Gauge, HardHat, Receipt, Ruler,
  Shield, ShieldCheck, TrendingUp, Users,
} from "@/components/icons";
import { MENU, isGroupActive, isItemActive, type MenuGroup } from "@/lib/menu";

const ICONS: Record<string, any> = {
  sales: TrendingUp, operations: CalendarCheck, projects: HardHat, hr: Users,
  finance: Receipt, qms: Shield, field: Camera, admin: ShieldCheck,
  asset: Gauge, design: Ruler, training: Award,
};

function useActive() {
  const pathname = usePathname();
  const line = useSearchParams().get("line");
  return { pathname, line };
}

function Items({ group, isDark, onNavigate }: { group: MenuGroup; isDark: boolean; onNavigate: () => void }) {
  const { pathname, line } = useActive();
  return (
    <>
      {group.note && (
        <p className={`px-3 pt-1 pb-2 text-[11px] leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>{group.note}</p>
      )}
      {group.items.map((item) => {
        const active = isItemActive(item, pathname, line);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`block px-3 py-2 rounded-xl font-bold transition-colors ${
              active
                ? "bg-[#0084bf] text-white"
                : isDark
                ? "text-slate-100 hover:bg-slate-800"
                : "text-[#00618e] hover:bg-sky-50"
            }`}
          >
            <div>{item.name}</div>
            <div className={`text-[11px] font-normal ${active ? "text-sky-100" : "text-slate-400"}`}>{item.subtitle}</div>
          </Link>
        );
      })}
    </>
  );
}

function DesktopBar({ isDark }: { isDark: boolean }) {
  const { pathname, line } = useActive();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => setOpen(null), [pathname, line]);
  useEffect(() => {
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, []);

  return (
    <nav ref={ref} aria-label="Main menu" className="flex flex-wrap items-center gap-x-0.5 gap-y-1 text-[11px] xl:text-xs font-extrabold uppercase tracking-wider whitespace-nowrap">
      {MENU.map((g, i) => {
        const Icon = ICONS[g.icon];
        const active = isGroupActive(g, pathname, line);
        const isOpen = open === g.id;
        return (
          <div key={g.id} className="relative" onMouseEnter={() => setOpen(g.id)} onMouseLeave={() => setOpen(null)}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : g.id)}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              className={`flex items-center gap-1 px-2 py-1.5 xl:px-2.5 rounded-xl transition-all cursor-pointer ${
                active
                  ? "bg-[#0084bf] text-white shadow-sm shadow-sky-500/20"
                  : isDark
                  ? "text-slate-100 hover:bg-slate-800"
                  : "text-[#004b6e] hover:bg-sky-50 hover:text-[#0084bf]"
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 hidden 2xl:block" />}
              <span>{g.title}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div
                role="menu"
                className={`absolute top-full ${i >= MENU.length - 4 ? "right-0" : "left-0"} w-72 max-h-[80vh] overflow-y-auto ${
                  isDark ? "bg-[#001a2c] border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                } border rounded-2xl shadow-2xl p-1.5 z-[110] normal-case tracking-normal text-xs space-y-0.5`}
              >
                <Items group={g} isDark={isDark} onNavigate={() => setOpen(null)} />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function MobileList({ isDark, onNavigate }: { isDark: boolean; onNavigate: () => void }) {
  const { pathname, line } = useActive();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <nav aria-label="Main menu" className="space-y-1">
      {MENU.map((g) => {
        const Icon = ICONS[g.icon];
        const isOpen = open === g.id;
        const active = isGroupActive(g, pathname, line);
        return (
          <div key={g.id}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : g.id)}
              aria-expanded={isOpen}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider ${
                active ? "bg-[#0084bf] text-white" : isDark ? "text-slate-100 hover:bg-slate-800" : "text-[#004b6e] hover:bg-sky-50"
              }`}
            >
              <span className="flex items-center gap-2">{Icon && <Icon className="w-4 h-4" />}{g.title}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="mt-1 ml-2 pl-2 border-l-2 border-[#0084bf]/30 text-xs space-y-0.5">
                <Items group={g} isDark={isDark} onNavigate={onNavigate} />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** useSearchParams needs a Suspense boundary during static rendering. */
export function MainMenu({ isDark, variant, onNavigate = () => {} }: {
  isDark: boolean; variant: "desktop" | "mobile"; onNavigate?: () => void;
}) {
  return (
    <Suspense fallback={null}>
      {variant === "desktop" ? <DesktopBar isDark={isDark} /> : <MobileList isDark={isDark} onNavigate={onNavigate} />}
    </Suspense>
  );
}
