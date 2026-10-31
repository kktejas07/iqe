"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  SearchX,
  Plus,
  Sparkles,
  User,
  Briefcase,
  CalendarCheck,
  FileText,
  Palette,
  Sun,
  Moon,
  Check,
  ChevronDown,
  Settings,
  LogOut,
  Building2,
  Factory,
  ClipboardList,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  DollarSign,
  Award,
  CheckSquare,
  Shield,
  Layers,
  Sliders,
  BarChart3,
  Ruler,
  AlertTriangle,
  Printer,
  Pill,
  Compass,
  Zap,
  PackageCheck,
  Menu,
  X,
  BookOpen,
  Table,
  Receipt,
  CreditCard,
  PhoneCall,
  HardHat,
} from "@/components/icons";
import { api } from "@/lib/api";
import { ThemeType } from "./LayoutWrapper";
import { IQELogo } from "./IQELogo";
import { MainMenu } from "./MainMenu";

const THEME_LABELS: Record<ThemeType, string> = {
  "iqe-brand": "IQE Brand",
  "google-light": "Google Light",
  "google-dark": "Google Dark",
  "material-blue": "Material Blue",
};

interface HeaderProps {
  theme?: ThemeType;
  changeTheme?: (theme: ThemeType) => void;
}

export function Header({ theme = "iqe-brand", changeTheme }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quickMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Close all menus when navigating
  useEffect(() => {
    setActiveDropdown(null);
    setShowQuickMenu(false);
    setShowThemeMenu(false);
    setMobileMenuOpen(false);
    setSearchResults(null);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Click outside / Escape closes popovers; Ctrl+K or Cmd+K focuses search
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (quickMenuRef.current && !quickMenuRef.current.contains(target)) setShowQuickMenu(false);
      if (themeMenuRef.current && !themeMenuRef.current.contains(target)) setShowThemeMenu(false);
      if (searchBoxRef.current && !searchBoxRef.current.contains(target)) setSearchResults(null);
      if (navRef.current && !navRef.current.contains(target)) setActiveDropdown(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === "Escape") {
        setShowQuickMenu(false);
        setShowThemeMenu(false);
        setActiveDropdown(null);
        setSearchResults(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.aiSearch(query);
      setSearchResults(res.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const isDark = theme === "google-dark";

  const handleLogout = () => {
    if (typeof window !== "undefined") localStorage.clear();
    router.push("/login");
  };

  return (
    <header className={`w-full ${isDark ? "bg-[#001a2c]/95 backdrop-blur-md border-slate-800 text-white" : "bg-white/90 backdrop-blur-md border-slate-200/90 text-slate-800"} border-b sticky top-0 z-[100] transition-all duration-300 ${scrolled ? "header-scrolled" : "shadow-sm"}`}>
      {/* Top Header Branding & Primary Navigation Row */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* IQE Brand Logo (Official Q & Globe Logo + Title) */}
        <Link href="/dashboard" className="flex items-center gap-3 group min-w-0 shrink" aria-label="Ideal Quality Engineers (I) Pvt Ltd - home">
          <IQELogo className="w-11 h-11 shrink-0 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 ease-spring drop-shadow-sm" />
          {/* The wordmark is deliberately not repeated here. Measured at 1600px
              the nav needs 1148px and the actions 295px, leaving 77px - not
              enough for the company name, which rendered as "I...". Inside the
              app the logo already says whose product this is, and the full
              legal name is on this link's accessible name and in every
              document the app produces. Restoring it means re-adding the
              block and reducing the number of top-level nav items. */}
        </Link>

        {/* The eleven department menus are in the bar below. */}
        <div className="flex-1" />

        {/* Right Header Quick Controls & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile Navigation Toggle (Visible on lg:hidden) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-sky-200 dark:border-slate-700 bg-sky-50 dark:bg-slate-800 text-[#00618e] dark:text-slate-100 hover:bg-sky-100 transition-colors cursor-pointer"
            title="Toggle All Modules Navigation"
            aria-label="Toggle All Modules Navigation"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-[#e35f14]" /> : <Menu className="w-4 h-4 text-[#0084bf]" />}
          </button>

          {/* Quick Create Dropdown */}
          <div className="relative" ref={quickMenuRef}>
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              aria-expanded={showQuickMenu}
              aria-haspopup="menu"
              className="sheen flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0084bf] via-[#0075ab] to-[#e35f14] text-white text-xs font-bold transition-all duration-500 shadow-md glow-iqe-blue hover:shadow-glow-orange"
            >
              <Plus className={`w-4 h-4 transition-transform duration-300 ${showQuickMenu ? "rotate-45" : ""}`} />
              <span className="hidden sm:inline">Create</span>
            </button>

            {showQuickMenu && (
              <div role="menu" className={`absolute right-0 top-12 w-56 origin-top-right animate-dropdown-in ${isDark ? "bg-[#001a2c] border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"} border rounded-2xl shadow-2xl p-1.5 z-[110]`}>
                <Link
                  href="/jobs/new"
                  onClick={() => setShowQuickMenu(false)}
                  className="group/item flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold hover:bg-sky-50 dark:hover:bg-slate-800 rounded-xl transition-all hover:translate-x-0.5"
                >
                  <Briefcase className="w-4 h-4 text-[#0084bf]" />
                  <span>New Assignment</span>
                </Link>
                <Link
                  href="/visits/new"
                  onClick={() => setShowQuickMenu(false)}
                  className="group/item flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold hover:bg-sky-50 dark:hover:bg-slate-800 rounded-xl transition-all hover:translate-x-0.5"
                >
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  <span>Schedule Inspector Visit</span>
                </Link>
                <Link
                  href="/tpi-billing"
                  onClick={() => setShowQuickMenu(false)}
                  className="group/item flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-slate-800 rounded-xl transition-all hover:translate-x-0.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#e35f14]" />
                  <span>New RA Bill Claim</span>
                </Link>
              </div>
            )}
          </div>

          {/* Theme Dropdown */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              aria-expanded={showThemeMenu}
              aria-haspopup="menu"
              className="p-2 px-3 rounded-xl border border-sky-200 dark:border-slate-700 bg-sky-50/80 dark:bg-slate-800 hover:bg-sky-100 text-[#00618e] dark:text-slate-100 flex items-center gap-1.5 text-xs font-extrabold shadow-xs"
              title="Theme Switcher"
            >
              <Palette className={`w-4 h-4 text-[#e35f14] transition-transform duration-500 ${showThemeMenu ? "rotate-180" : ""}`} />
              <span className="hidden 2xl:inline">{THEME_LABELS[theme]}</span>
            </button>
            {showThemeMenu && changeTheme && (
              <div role="menu" className="absolute right-0 top-11 w-56 origin-top-right animate-dropdown-in bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 z-[110] text-xs space-y-0.5">
                <div className="px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Appearance</div>
                {([
                  { id: "iqe-brand", label: "IQE Brand", swatch: "from-[#0084bf] to-[#e35f14]" },
                  { id: "google-light", label: "Google Light", swatch: "from-slate-100 to-white" },
                  { id: "google-dark", label: "Google Dark", swatch: "from-[#001a2c] to-slate-700" },
                  { id: "material-blue", label: "Material Blue", swatch: "from-sky-300 to-[#0084bf]" },
                ] as { id: ThemeType; label: string; swatch: string }[]).map((t) => (
                  <button
                    key={t.id}
                    role="menuitemradio"
                    aria-checked={theme === t.id}
                    onClick={() => { changeTheme(t.id); setShowThemeMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 font-bold transition-colors ${
                      theme === t.id
                        ? "bg-sky-50 dark:bg-slate-800 text-[#00618e] dark:text-sky-300"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md bg-gradient-to-br ${t.swatch} border border-slate-200 dark:border-slate-700 shadow-xs shrink-0`} />
                    <span className="flex-1">{t.label}</span>
                    {theme === t.id && <Check className="w-3.5 h-3.5 text-[#0084bf] animate-scale-up" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Avatar & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-[#0084bf] to-[#e35f14] text-white font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-white dark:ring-slate-900 hover:scale-105 transition-transform">
              <User className="w-4 h-4" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" title="Online" />
            </div>
            <button
              onClick={handleLogout}
              className="group/logout p-2 rounded-xl text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors"
              aria-label="Sign out"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 transition-transform duration-300 group-hover/logout:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Department menus (slide: Menu structure) */}
      <div className={`hidden lg:block px-4 sm:px-6 py-1.5 border-t ${isDark ? "border-slate-800" : "border-slate-200/80"}`}>
        <MainMenu isDark={isDark} variant="desktop" />
      </div>

      {/* Sub-Header Bar with AI Search */}
      <div className={`px-4 sm:px-6 py-2 ${isDark ? "bg-[#080e21] border-slate-800" : "bg-slate-50/90 border-slate-200/80"} border-t flex items-center justify-between gap-4 text-xs`}>
        <div className="relative flex-1 max-w-xl" ref={searchBoxRef}>
          <form onSubmit={handleSearch} className="relative group/search">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value) setSearchResults(null);
              }}
              placeholder="Search for assignments, clients, visits, TPI bill verification numbers..."
              aria-label="Search"
              className={`w-full pl-9 pr-20 py-1.5 text-xs font-semibold ${isDark ? "bg-slate-800 text-white border-slate-700 placeholder-slate-400" : "bg-white text-slate-900 border-slate-300 placeholder-slate-500"} border rounded-xl focus:outline-none focus:ring-4 focus:ring-[#0084bf]/15 focus:border-[#0084bf] shadow-inner`}
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 transition-colors group-focus-within/search:text-[#0084bf]" />
            <kbd className={`hidden sm:flex absolute right-9 top-1.5 items-center gap-0.5 px-1.5 h-5 rounded-md border text-[11px] font-mono font-bold pointer-events-none transition-opacity group-focus-within/search:opacity-0 ${isDark ? "border-slate-600 text-slate-400 bg-slate-900" : "border-slate-200 text-slate-400 bg-slate-50"}`}>
              Ctrl K
            </kbd>
            <button type="submit" className="absolute right-2 top-1 p-1 rounded-lg text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-700" title="AI Search" aria-label="Run AI search">
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            </button>
          </form>

          {searchResults && (
            <div className="absolute top-10 left-0 w-full origin-top animate-dropdown-in bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-[110] max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between px-2 mb-1 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
                </span>
                <button onClick={() => setSearchResults(null)} className="text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">Esc</button>
              </div>
              {searchResults.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-2 text-center animate-fade-in">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <SearchX className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No matches for &ldquo;{query}&rdquo;</p>
                  <p className="text-[11px] text-slate-400">Try an assignment ID, client name or bill number.</p>
                </div>
              ) : (
                <div className="stagger space-y-0.5">
                  {searchResults.map((item: any, idx: number) => (
                    <button type="button" key={idx} onClick={() => { setSearchResults(null); if (item.type === "job") router.push(`/jobs/${item.id}`); }} className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center gap-3 text-xs transition-colors">
                      <span className="font-semibold truncate">{item.title || item.id}</span>
                      <span className="shrink-0 px-2 py-0.5 rounded-full badge-iqe text-[11px] uppercase font-bold">{item.type === 'job' ? 'Assignment' : item.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Responsive Mobile Drawer for Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 max-h-[75vh] overflow-y-auto animate-dropdown-in shadow-2xl">
          <MainMenu isDark={isDark} variant="mobile" onNavigate={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
}
