"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Filter,
  Plus,
  UserCheck,
  Briefcase,
  FileCheck,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";

export default function VisitsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const params: any = { per_page: 50 };
      if (filter) params.status = filter;
      const r = await api.listVisits(params);
      setVisits(r.data || []);
      setTotal(r.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const statusBadges: Record<string, string> = {
    scheduled: "badge-blue",
    initiated: "badge-indigo",
    in_progress: "badge-amber",
    completed: "badge-emerald",
    quality_check_completed: "badge-purple",
    finance_check_completed: "badge-teal",
    invoice_initiated: "badge-indigo",
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Inspector Field Visits</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold font-mono">
              {total}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track inspector site visits, QC approvals, findings, and expense claims
          </p>
        </div>

        <Link
          href="/visits/new"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-xs shadow-lg glow-indigo hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Visit</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:w-64">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          >
            <option value="">All Visit Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="initiated">Initiated</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="quality_check_completed">QC Approved</option>
            <option value="finance_check_completed">Finance Approved</option>
          </select>
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Visits Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading visits...</div>
        ) : visits.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">No field visits scheduled</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80">
                  <th className="p-4">Visit ID</th>
                  <th className="p-4">Job Reference</th>
                  <th className="p-4">Assigned Inspector</th>
                  <th className="p-4">Planned Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visits.map((v) => (
                  <tr key={v.visit_id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600">{v.visit_id}</td>
                    <td className="p-4">
                      <span className="font-mono text-slate-700 font-medium">{v.job_id}</span>
                    </td>
                    <td className="p-4 text-slate-800 font-medium">
                      {v.inspector_name || "Unassigned"}
                    </td>
                    <td className="p-4 text-slate-500">
                      {v.planned_date ? new Date(v.planned_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          statusBadges[v.status] || "badge-blue"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/visits/${v.visit_id}`}
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <span>Open Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
