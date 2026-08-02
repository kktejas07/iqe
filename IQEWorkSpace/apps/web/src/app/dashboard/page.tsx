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
} from "lucide-react";
import { api } from "@/lib/api";

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

  const loadData = async () => {
    setLoading(true);
    try {
      const s = await api.getStats();
      setStats(s);
      const j = await api.listJobs({ per_page: 6 });
      setRecentJobs(j.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cards = [
    { label: "Total Jobs", value: stats.total, icon: Briefcase, color: "from-indigo-600 to-blue-600", light: "bg-indigo-50 text-indigo-700" },
    { label: "Open Jobs", value: stats.open, icon: Clock, color: "from-blue-500 to-cyan-500", light: "bg-blue-50 text-blue-700" },
    { label: "In Progress", value: stats.in_progress, icon: TrendingUp, color: "from-amber-500 to-orange-500", light: "bg-amber-50 text-amber-700" },
    { label: "QC Pending", value: stats.qc_pending, icon: AlertCircle, color: "from-purple-600 to-indigo-600", light: "bg-purple-50 text-purple-700" },
    { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "from-emerald-500 to-teal-500", light: "bg-emerald-50 text-emerald-700" },
    { label: "Invoiced", value: stats.invoiced, icon: DollarSign, color: "from-indigo-700 to-purple-700", light: "bg-indigo-50 text-indigo-700" },
    { label: "Closed", value: stats.closed, icon: FileCheck, color: "from-slate-600 to-slate-800", light: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl gradient-indigo-dark text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-300" /> Operational Overview
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-heading tracking-tight text-white">
            Inspection Control Dashboard
          </h1>
          <p className="text-xs text-slate-400">
            Real-time status of active jobs, inspector field visits, and invoice processing.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/jobs/new"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-xs shadow-lg glow-indigo hover:opacity-95 transition-opacity flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Job</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 truncate">{c.label}</span>
                <div className={`p-1.5 rounded-lg ${c.light}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 font-heading">
                  {loading ? "..." : c.value}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                  <span>Active</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Jobs Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">Recent Jobs</h2>
              <p className="text-xs text-slate-500">Latest active inspection job dispatches</p>
            </div>
            <Link
              href="/jobs"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View All Jobs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {recentJobs.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No recent jobs found.</p>
            ) : (
              recentJobs.map((job) => (
                <Link
                  key={job.job_id}
                  href={`/jobs/${job.job_id}`}
                  className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
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
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
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
                    <span className="text-xs font-mono font-bold text-slate-700">
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
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Gemini AI Assistant</span>
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-white">Smart Match & Audit</h3>
              <p className="text-xs text-indigo-200/80 mt-1 leading-relaxed">
                Utilize vector-based inspector scoring and automated anomaly flags on field visits.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <Link
                href="/visits"
                className="w-full py-2 px-3 rounded-xl bg-indigo-600/40 hover:bg-indigo-600/60 border border-indigo-400/40 text-xs font-semibold text-white flex items-center justify-between transition-colors"
              >
                <span>Run Anomaly Detection</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-300" />
              </Link>
              <Link
                href="/jobs"
                className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-between transition-colors"
              >
                <span>Suggest Optimal Inspectors</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Navigation Quick Launcher */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 font-heading">Quick Operations</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/visits"
                className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors flex items-center gap-2 text-xs font-semibold"
              >
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Field Visits</span>
              </Link>
              <Link
                href="/invoices"
                className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors flex items-center gap-2 text-xs font-semibold"
              >
                <DollarSign className="w-4 h-4 text-purple-500" />
                <span>Invoices</span>
              </Link>
              <Link
                href="/clients"
                className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors flex items-center gap-2 text-xs font-semibold"
              >
                <Building className="w-4 h-4 text-blue-500" />
                <span>Clients</span>
              </Link>
              <Link
                href="/service-orders"
                className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors flex items-center gap-2 text-xs font-semibold"
              >
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span>Orders</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
