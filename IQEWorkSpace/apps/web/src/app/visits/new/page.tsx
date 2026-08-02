"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, Plus } from "lucide-react";
import { api } from "@/lib/api";

function NewVisitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("job_id") || "";

  const [jobId, setJobId] = useState(initialJobId);
  const [inspectorName, setInspectorName] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialJobId) setJobId(initialJobId);
  }, [initialJobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createVisit({
        visit_id: `VISIT-${Date.now().toString().slice(-6)}`,
        job_id: jobId,
        inspector_name: inspectorName,
        planned_date: plannedDate || null,
        status: "scheduled",
      });
      router.push(`/visits/${res.visit_id || ""}`);
    } catch (err) {
      console.error(err);
      alert("Failed to schedule visit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/visits"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Visits</span>
      </Link>

      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl gradient-indigo-blue flex items-center justify-center text-white shadow-md">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 font-heading">Schedule Inspector Visit</h1>
            <p className="text-xs text-slate-500">Dispatch an inspector for field verification</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Job ID Reference *</label>
            <input
              type="text"
              required
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="e.g. JOB-1001"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Inspector Name</label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="e.g. Vikram Sharma (Senior NDT Level II)"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Planned Visit Date</label>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Link
              href="/visits"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-xs shadow-lg glow-indigo hover:opacity-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? "Scheduling..." : "Schedule Visit"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewVisitPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading form...</div>}>
      <NewVisitForm />
    </Suspense>
  );
}
