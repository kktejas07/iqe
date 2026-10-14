"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Clock,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  FileCheck,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Building,
  Plus,
  RefreshCw,
} from "@/components/icons";
import { api } from "@/lib/api";
import { AnimatedNumber } from "@/components/AnimatedNumber";

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    qc_pending: 0,
    approved: 0,
    invoiced: 0,
    closed: 0,
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Live record counts keyed by backend id (Client, Manufacturer, ...); null until loaded
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Independent requests: one failing shouldn't blank the others
      const [s, j, c] = await Promise.allSettled([api.getStats(), api.listJobs({ per_page: 6 }), api.getAdminCounts()]);
      if (s.status === "fulfilled") setStats(s.value);
      if (j.status === "fulfilled") setRecentJobs(j.value.data || []);
      if (c.status === "fulfilled") {
        setCounts(Object.fromEntries((c.value.counts || []).map((x: { id: string; count: number }) => [x.id, x.count])));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cards = [
    { label: "Total Jobs", value: stats.total, icon: Briefcase, color: "from-brand-600 to-blue-600", light: "bg-brand-50 text-brand-700" },
    { label: "Open Jobs", value: stats.open, icon: Clock, color: "from-blue-500 to-cyan-500", light: "bg-blue-50 text-blue-700" },
    { label: "In Progress", value: stats.in_progress, icon: TrendingUp, color: "from-amber-500 to-orange-500", light: "bg-amber-50 text-amber-700" },
    { label: "QC Pending", value: stats.qc_pending, icon: AlertCircle, color: "from-purple-600 to-brand-600", light: "bg-purple-50 text-purple-700" },
    { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "from-emerald-500 to-teal-500", light: "bg-emerald-50 text-emerald-700" },
    { label: "Invoiced", value: stats.invoiced, icon: DollarSign, color: "from-brand-700 to-purple-700", light: "bg-brand-50 text-brand-700" },
    { label: "Closed", value: stats.closed, icon: FileCheck, color: "from-slate-600 to-slate-800", light: "bg-slate-100 text-slate-700" },
  ];

  const metricCards = [
    { label: "Clients", key: "Client", icon: Building, href: "/clients" },
    { label: "Manufacturers", key: "Manufacturer", icon: Sparkles, href: "/manufacturers" },
    { label: "Purchase Orders", key: "PurchaseOrder", icon: TrendingUp, href: "/purchase-orders" },
    { label: "Service Orders", key: "ServiceOrder", icon: Briefcase, href: "/service-orders" },
    { label: "Employees", key: "Employee", icon: Clock, href: "/admin" },
    { label: "Visits", key: "Visits", icon: Calendar, href: "/visits" },
    { label: "Invoice Details", key: "InvoiceDetails", icon: FileCheck, href: "/invoices" },
    { label: "Payment Details", key: "Financials", icon: DollarSign, href: "/accounts-receivable" },
  ].map((c) => ({ ...c, value: counts?.[c.key] ?? null }));


  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  return (
    <div className="space-y-6">
      {/* Home Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[#0084bf] dark:text-sky-400 flex items-center gap-1.5" suppressHydrationWarning>
            <Sparkles className="w-3.5 h-3.5 text-[#e35f14]" />
            <span>{greeting}</span>
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-heading tracking-tight">Home Page</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-sky-50 dark:hover:bg-slate-700 hover:border-sky-200 hover:text-[#00618e] disabled:opacity-70 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Industrial Hero Banner Carousel (Screenshot 1) */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-900 h-56 sm:h-72 group">
        {/* Plant Image Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-90 scale-105 group-hover:scale-110 transition-transform duration-[2000ms] ease-out-expo"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#001a2c]/90 via-[#001a2c]/50 to-transparent"></div>
        </div>

        {/* Top Left Slide Indicator */}
        <div className="absolute top-4 left-4 px-3 py-1 rounded-md bg-black/40 backdrop-blur-md text-white text-xs font-mono font-bold border border-white/20">
          2 / 2
        </div>

        {/* Banner Overlay Content */}
        <div className="relative z-10 p-6 sm:p-8 h-full flex flex-col justify-end max-w-2xl text-white stagger">
          <span className="px-2.5 py-0.5 rounded-full bg-[#0084bf]/30 border border-sky-400/40 text-sky-200 text-[11px] font-bold tracking-wider uppercase mb-2 inline-flex items-center gap-1.5 w-fit backdrop-blur-sm">
            <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-[#e35f14] animate-ping-soft" /><span className="relative w-1.5 h-1.5 rounded-full bg-[#e35f14]" /></span>
            Industrial Inspection Engine
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading leading-tight">
            Ideal Quality Engineers <span className="text-gradient-iqe">Portal</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mt-1 line-clamp-2">
            Third Party Inspection (TPI), ISO 9001:2026 &amp; ISO/IEC 17020:2026 Compliance, Plant Pressure Vessel Audits &amp; BOQ Verification.
          </p>
        </div>

        {/* Carousel Bottom Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-white/50"></span>
          <span className="w-3 h-3 rounded-full bg-white shadow-md"></span>
        </div>
      </div>

      {/* 8 Blue Metric Cards Grid (Screenshot 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger">
        {metricCards.map(({ label, value, icon: Icon, href }) => {
          const body = (
            <>
              <div className="relative z-[2]">
                <p className="text-xs font-medium text-sky-100 uppercase tracking-wider">{label}</p>
                <p className="text-2xl sm:text-3xl font-extrabold font-heading mt-1">
                  {value !== null ? (
                    <AnimatedNumber value={value} />
                  ) : loading ? (
                    <span className="inline-block w-12 h-7 rounded-md bg-white/25 animate-pulse align-middle" />
                  ) : (
                    <span title="Couldn't load this count" className="text-white/70">—</span>
                  )}
                </p>
              </div>
              <div className="relative z-[2] w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 ring-1 ring-white/25 transition-transform duration-500 ease-spring group-hover:scale-110 group-hover:rotate-6">
                <Icon className="w-5 h-5" />
              </div>
              {/* decorative orb */}
              <span aria-hidden className="absolute -right-6 -bottom-8 w-24 h-24 rounded-full bg-white/10 transition-transform duration-700 ease-out-expo group-hover:scale-150" />
            </>
          );
          const cls = "sheen group relative p-4 rounded-2xl bg-gradient-to-br from-sky-500 via-[#0084bf] to-[#00618e] text-white shadow-md flex items-center justify-between overflow-hidden";
          return href ? (
            <Link key={label} href={href} className={`${cls} card-hover hover:shadow-glow-blue`}>
              {body}
            </Link>
          ) : (
            <div key={label} className={cls}>
              {body}
            </div>
          );
        })}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Jobs Table */}
        <div className="lg:col-span-2 bg-white dark:bg-[#002235] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-6 space-y-4 animate-page-in [animation-delay:200ms]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">Recent Jobs</h2>
              <p className="text-xs text-slate-500">Latest active inspection job dispatches</p>
            </div>
            <Link
              href="/jobs"
              className="group text-xs font-semibold text-[#0084bf] hover:text-[#00618e] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors"
            >
              <span>View All Jobs</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-x-auto">
            {loading && recentJobs.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-3 px-2 flex items-center gap-3">
                  <div className="skeleton w-8 h-8 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3 w-2/5" />
                    <div className="skeleton h-2.5 w-1/4" />
                  </div>
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
              ))
            ) : recentJobs.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0084bf] flex items-center justify-center animate-float">
                  <Briefcase className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">No recent jobs yet</p>
                <p className="text-xs text-slate-400">New inspection assignments will appear here.</p>
                <Link href="/jobs/new" className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0084bf] hover:bg-[#00618e] text-white text-xs font-semibold transition-colors">
                  <Plus className="w-3.5 h-3.5" /> New Assignment
                </Link>
              </div>
            ) : (
              recentJobs.map((job) => (
                <Link
                  key={job.job_id}
                  href={`/jobs/${job.job_id}`}
                  className="py-3 px-2 flex items-center justify-between hover:bg-sky-50/60 dark:hover:bg-slate-800/60 rounded-xl transition-all duration-200 hover:translate-x-0.5 group animate-page-in"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0084bf] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-[#0084bf] group-hover:text-white group-hover:scale-105">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#0084bf] transition-colors truncate">
                        {job.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono text-slate-500">{job.job_id}</span>
                        {job.client_name && (
                          <span className="flex items-center gap-0.5 text-slate-500">
                            • <Building className="w-3 h-3 text-slate-400" /> {job.client_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pl-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                        job.status === "open"
                          ? "badge-emerald"
                          : job.status === "in_progress"
                          ? "badge-amber"
                          : job.status === "closed"
                          ? "badge-indigo"
                          : "badge-blue"
                      }`}
                    >
                      {job.status}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                      ₹{(job.budget || 0).toLocaleString()}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right Column: AI Action Suite & Quick Links */}
        <div className="space-y-6">
          {/* AI Intelligence Card */}
          <div className="relative overflow-hidden p-6 rounded-2xl gradient-iqe-dark border border-[#0084bf]/30 text-white shadow-lg space-y-4 animate-page-in [animation-delay:260ms]">
            <span aria-hidden className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#0084bf]/30 blur-2xl animate-blob" />
            <span aria-hidden className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-[#e35f14]/20 blur-2xl animate-blob [animation-delay:-6s]" />
            <div className="relative flex items-center gap-2 text-sky-300">
              <Sparkles className="w-4 h-4 text-[#e35f14] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Gemini AI Assistant</span>
            </div>
            <div className="relative">
              <h3 className="text-lg font-bold font-heading text-white">Smart Match & Audit</h3>
              <p className="text-xs text-sky-100/80 mt-1 leading-relaxed">
                Utilize vector-based inspector scoring and automated anomaly flags on field visits.
              </p>
            </div>
            <div className="relative space-y-2 pt-2">
              <Link
                href="/visits"
                className="group sheen w-full py-2 px-3 rounded-xl bg-[#0084bf]/40 hover:bg-[#0084bf]/60 border border-sky-400/40 text-xs font-semibold text-white flex items-center justify-between transition-colors"
              >
                <span>Run Anomaly Detection</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-sky-300 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                href="/jobs"
                className="group w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-slate-600/60 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-between transition-colors"
              >
                <span>Suggest Optimal Inspectors</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>

          {/* Navigation Quick Launcher */}
          <div className="bg-white dark:bg-[#002235] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-6 space-y-3 animate-page-in [animation-delay:320ms]">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">Quick Operations</h3>
            <div className="grid grid-cols-2 gap-2 stagger">
              <Link
                href="/visits"
                className="group p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#00618e] border border-transparent hover:border-sky-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft flex items-center gap-2 text-xs font-semibold"
              >
                <Calendar className="w-4 h-4 text-brand-500 transition-transform duration-300 group-hover:scale-125" />
                <span>Field Visits</span>
              </Link>
              <Link
                href="/invoices"
                className="group p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#00618e] border border-transparent hover:border-sky-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft flex items-center gap-2 text-xs font-semibold"
              >
                <DollarSign className="w-4 h-4 text-purple-500 transition-transform duration-300 group-hover:scale-125" />
                <span>Invoices</span>
              </Link>
              <Link
                href="/clients"
                className="group p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#00618e] border border-transparent hover:border-sky-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft flex items-center gap-2 text-xs font-semibold"
              >
                <Building className="w-4 h-4 text-blue-500 transition-transform duration-300 group-hover:scale-125" />
                <span>Clients</span>
              </Link>
              <Link
                href="/service-orders"
                className="group p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#00618e] border border-transparent hover:border-sky-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft flex items-center gap-2 text-xs font-semibold"
              >
                <FileCheck className="w-4 h-4 text-emerald-500 transition-transform duration-300 group-hover:scale-125" />
                <span>Orders</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
