"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  Building,
  Calendar,
  DollarSign,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [search, status]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.listJobs({ search, status, per_page: 50 });
      setJobs(r.data || []);
      setTotal(r.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Inspection Jobs</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold font-mono">
              {total}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Manage active inspection projects and assignments</p>
        </div>

        <Link
          href="/jobs/new"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-xs shadow-lg glow-indigo hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Job</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job title, ID, client..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="relative w-full sm:w-48">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
            <option value="closed">Closed</option>
          </select>
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">No jobs matching filter criteria</p>
            <p className="text-xs text-slate-400">Try adjusting your search terms or create a new job.</p>
          </div>
        ) : (
          jobs.map((j) => (
            <Link
              key={j.job_id}
              href={`/jobs/${j.job_id}`}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-indigo-50/30 transition-colors group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {j.job_id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {j.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {j.client_name && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" /> {j.client_name}
                      </span>
                    )}
                    {j.requested_start && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(j.requested_start).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="text-left sm:text-right">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      j.status === "open"
                        ? "badge-emerald"
                        : j.status === "in_progress"
                        ? "badge-amber"
                        : j.status === "draft"
                        ? "badge-blue"
                        : j.status === "closed"
                        ? "badge-indigo"
                        : "badge-purple"
                    }`}
                  >
                    {j.status}
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-700 mt-1">
                    ₹{(j.budget || 0).toLocaleString()}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
