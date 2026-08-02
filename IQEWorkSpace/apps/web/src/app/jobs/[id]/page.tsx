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
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-900/60 px-2.5 py-1 rounded-md border border-indigo-700/50">
              {job.job_id}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                job.status === "open"
                  ? "badge-emerald"
                  : job.status === "in_progress"
                  ? "badge-amber"
                  : "badge-blue"
              }`}
            >
              {job.status}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-white">{job.title}</h1>
          {job.client_name && (
            <p className="text-xs text-slate-300 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-400" /> Client: {job.client_name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 shrink-0">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Budget</p>
            <p className="text-xl font-extrabold text-white font-mono">
              ₹{(job.budget || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Requested Start Date</p>
            <p className="text-sm font-bold text-slate-800">
              {job.requested_start ? new Date(job.requested_start).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Requested End Date</p>
            <p className="text-sm font-bold text-slate-800">
              {job.requested_end ? new Date(job.requested_end).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Creation Date</p>
            <p className="text-sm font-bold text-slate-800">
              {job.created_at ? new Date(job.created_at).toLocaleDateString() : "Active"}
            </p>
          </div>
        </div>
      </div>

      {/* AI Inspector Suggestion Panel */}
      {aiInspectors.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/10 via-indigo-900/10 to-blue-900/10 border border-indigo-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
              AI Inspector Matching Score Engine
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {aiInspectors.map((ins: any) => (
              <div
                key={ins.user_id}
                className="px-3.5 py-2 rounded-xl bg-white border border-indigo-100 shadow-sm flex items-center gap-2 text-xs"
              >
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-slate-800">{ins.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono font-bold text-[10px]">
                  Match: {ins.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Service Orders & Control Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Orders */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 font-heading">Service Orders</h3>
            </div>
          </div>
          <div className="space-y-2">
            {(job.service_orders || []).map((so: any) => (
              <div
                key={so.so_id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs"
              >
                <span className="font-mono font-bold text-slate-800">{so.so_number}</span>
                <span className="font-mono font-bold text-indigo-600">₹{so.amount}</span>
              </div>
            ))}
            {(!job.service_orders || job.service_orders.length === 0) && (
              <p className="text-xs text-slate-400 py-3 text-center">No service orders linked.</p>
            )}
          </div>
        </div>

        {/* Control Numbers */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 font-heading">Control Numbers</h3>
            </div>
          </div>
          <div className="space-y-2">
            {(job.control_numbers || []).map((cn: any) => (
              <div
                key={cn.control_number_id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs"
              >
                <span className="font-mono font-bold text-slate-800">{cn.control_number}</span>
              </div>
            ))}
            {(!job.control_numbers || job.control_numbers.length === 0) && (
              <p className="text-xs text-slate-400 py-3 text-center">No control numbers linked.</p>
            )}
          </div>
        </div>
      </div>

      {/* Field Visits */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 font-heading">Field Visits Scheduled</h3>
          </div>
          <Link
            href={`/visits/new?job_id=${job.job_id}`}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Visit</span>
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {(job.visits || []).map((v: any) => (
            <Link
              key={v.visit_id}
              href={`/visits/${v.visit_id}`}
              className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-xl px-2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-indigo-600">{v.visit_id}</span>
                <span className="text-xs text-slate-700">{v.inspector_name || "Unassigned Inspector"}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase badge-blue">
                {v.status}
              </span>
            </Link>
          ))}
          {(!job.visits || job.visits.length === 0) && (
            <p className="text-xs text-slate-400 py-4 text-center">No field visits scheduled yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
