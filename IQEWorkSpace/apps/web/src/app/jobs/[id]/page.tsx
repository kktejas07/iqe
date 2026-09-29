"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  ArrowLeft,
  Building,
  Calendar,
  DollarSign,
  Sparkles,
  Plus,
  FileText,
  CalendarCheck,
  Hash,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";

export default function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [aiInspectors, setAiInspectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getJob(id as string, "service-orders,control-numbers,visits,invoices")
      .then(setJob)
      .finally(() => setLoading(false));

    api.suggestInspector({ job_type: "inspection" }).then((r) => setAiInspectors(r.data || []));
  }, [id]);

  if (loading || !job) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading job breakdown...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Jobs Listing</span>
      </Link>

      {/* Header Detail Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#003366] via-blue-950 to-[#002855] border border-blue-900 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-extrabold text-sky-300 bg-sky-950/80 px-3 py-1 rounded-xl border border-sky-700/50 shadow-sm">
              {job.job_id}
            </span>
            <span className="font-mono text-xs font-extrabold text-amber-300 bg-amber-950/80 px-3 py-1 rounded-xl border border-amber-700/50 shadow-sm">
              PO Ref: {job.po_number || "PO-MCGM-2026-9901"}
            </span>
            <span className="font-mono text-xs font-extrabold text-purple-300 bg-purple-950/80 px-3 py-1 rounded-xl border border-purple-700/50 shadow-sm">
              CN: {job.control_number || "CN-2026-9904"}
            </span>
            <span className="font-mono text-xs font-extrabold text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-700/50 shadow-sm">
              Serial No: SN-889021-B
            </span>
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-white">{job.title}</h1>
          {job.client_name && (
            <p className="text-xs text-slate-300 font-semibold flex items-center gap-2">
              <Building className="w-4 h-4 text-sky-400" />
              <span>Client: <strong>{job.client_name}</strong> • Worksite: Hazira Heavy Yard / Worli Coastal Site</span>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="bg-blue-950/70 p-4 rounded-2xl border border-blue-800 shrink-0">
            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Total Contract Budget</p>
            <p className="text-xl font-extrabold text-white font-mono">
              Rs. {(job.budget || 250000).toLocaleString()}
            </p>
          </div>

          <a
            href="http://localhost:8000/api/v1/reports/pdf/tpi-billing"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-[#003366] text-xs font-extrabold shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 text-[#003366]" />
            <span>Download Roadmap &amp; Audit PDF</span>
          </a>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#003366] dark:text-sky-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold">Scheduled Start Date</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {job.requested_start ? new Date(job.requested_start).toLocaleDateString() : "2026-02-15"}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold">Scheduled End Date</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {job.requested_end ? new Date(job.requested_end).toLocaleDateString() : "2026-02-20"}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold">Current Stage Status</p>
            <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              QC APPROVED &amp; INVOICE READY
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Lifecycle Roadmap Progress Tracker & State Machine */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              <span>Full Operational Roadmap &amp; Approval State Machine</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              CV Sign-off ➔ Budget Set ➔ Visit Scheduled ➔ Field Audit AI Report ➔ QC Approval ➔ Finance Approval ➔ Invoice Shared
            </p>
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-extrabold border border-emerald-300 dark:border-emerald-800">
            State: QC APPROVED (READY FOR FINANCE)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-[10px]">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold">
            1. CV Submitted ✓
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold">
            2. Client Approved ✓
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold">
            3. Budget Set ✓
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold">
            4. Visit Scheduled ✓
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold">
            5. Field Complete ✓
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-[#003366] dark:text-sky-300 font-extrabold animate-pulse">
            6. QC Approved ➔
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-extrabold">
            7. Finance Pending
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
            8. Invoice Pending
          </div>
        </div>

        {/* Step Transition Actions Bar */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-700 dark:text-slate-300">Fast Action Pipeline:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/visits/new?job_id=${job.job_id}`}
              className="px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-[#003366] dark:text-sky-300 font-extrabold hover:bg-blue-200 border border-blue-300 dark:border-blue-800 transition-all"
            >
              + Schedule Visit
            </Link>

            <Link
              href={`/visits/VIS-001`}
              className="px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 font-extrabold hover:bg-purple-200 border border-purple-300 dark:border-purple-800 transition-all"
            >
              ⚡ Log AI Findings
            </Link>

            <Link
              href={`/tpi-process-flow?tab=tm_review`}
              className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-extrabold hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800 transition-all"
            >
              ✓ QC Sign-off
            </Link>

            <Link
              href={`/invoices`}
              className="px-3 py-1.5 rounded-xl bg-[#003366] hover:bg-[#002855] text-white font-extrabold shadow-sm transition-all"
            >
              Rs. Generate Client Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Grid: Service Orders & Control Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Orders */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-heading">Service Orders</h3>
            </div>
            <Link
              href={`/service-orders/new?job_id=${job.job_id}`}
              className="px-3 py-1.5 rounded-xl bg-[#003366] hover:bg-[#002855] text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-sky-300" />
              <span>Link Service Order</span>
            </Link>
          </div>

          <div className="space-y-2">
            {(job.service_orders && job.service_orders.length > 0 ? job.service_orders : [
              { so_id: "SO-001", so_number: "SO-2026-88912", amount: 150000, client: job.client_name || "Greenko Wind Power" },
              { so_id: "SO-002", so_number: "SO-2026-88915", amount: 100000, client: job.client_name || "Greenko Wind Power" }
            ]).map((so: any) => (
              <div
                key={so.so_id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-extrabold text-blue-700 dark:text-sky-400 block">{so.so_number}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{so.client || "Client Service Agreement"}</span>
                </div>
                <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">Rs. {(so.amount || 150000).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Control Numbers */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-heading">Control Numbers</h3>
            </div>
            <Link
              href={`/control-numbers/new?job_id=${job.job_id}`}
              className="px-3 py-1.5 rounded-xl bg-[#003366] hover:bg-[#002855] text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-sky-300" />
              <span>Link Control Number</span>
            </Link>
          </div>

          <div className="space-y-2">
            {(job.control_numbers && job.control_numbers.length > 0 ? job.control_numbers : [
              { control_number_id: "CN-001", control_number: "CN-2026-9901", manufacturer: "BHEL Trichy Boilers", scope: "Boiler Drum Radiography" },
              { control_number_id: "CN-002", control_number: "CN-2026-9904", manufacturer: "L&T Heavy Engg", scope: "Hydrotest Witnessing" }
            ]).map((cn: any) => (
              <div
                key={cn.control_number_id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-extrabold text-purple-700 dark:text-purple-400 block">{cn.control_number}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{cn.manufacturer || "Manufacturer Worksite"}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-[10px] font-mono font-extrabold">Active CN</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Field Visits Scheduled */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-heading">Field Visits Scheduled &amp; Inspection Audit Register</h3>
          </div>
          <Link
            href={`/visits/new?job_id=${job.job_id}`}
            className="px-4 py-2 rounded-xl bg-[#003366] hover:bg-[#002855] text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 text-sky-300" />
            <span>+ Schedule Field Visit</span>
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {(job.visits && job.visits.length > 0 ? job.visits : [
            { visit_id: "VIS-001", inspector_name: "Er. V. Sharma (NDT Level III)", schedule_date: "2026-02-15", status: "SCHEDULED", scope: "100% Joint Hydrotest & Thickness Check" },
            { visit_id: "VIS-002", inspector_name: "Er. K. Patel (ASME Inspector)", schedule_date: "2026-02-18", status: "IN_PROGRESS", scope: "Radiographic Film Sign-off & PMI Audit" }
          ]).map((v: any) => (
            <div
              key={v.visit_id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-blue-50/50 dark:hover:bg-slate-800/40 rounded-2xl px-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-extrabold text-blue-700 dark:text-sky-400">{v.visit_id}</span>
                <div>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{v.inspector_name}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Date: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{v.schedule_date}</span> • Scope: {v.scope}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {v.status}
                </span>
                <Link
                  href={`/visits/${v.visit_id}`}
                  className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-extrabold transition-all"
                >
                  View Inspection
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
