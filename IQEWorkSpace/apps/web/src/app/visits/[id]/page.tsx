"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
  AlertOctagon,
  FileText,
  DollarSign,
  Camera,
  ShieldCheck,
  Check,
  Plus,
  Send,
  UserCheck,
} from "lucide-react";
import { api } from "@/lib/api";

export default function VisitDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [visit, setVisit] = useState<any>(null);
  const [aiReport, setAiReport] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any>(null);
  const [qcComment, setQcComment] = useState("");
  const [finComment, setFinComment] = useState("");
  const [expenseForm, setExpenseForm] = useState({ expense_id: "", type: "travel", amount: "", description: "" });
  const [findingForm, setFindingForm] = useState({ finding_id: "", description: "", severity: "observation", category: "visual" });
  const [submitForm, setSubmitForm] = useState({ inspection_report_no: "", comments: "" });
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisit();
  }, [id]);

  async function loadVisit() {
    if (!id) return;
    setLoading(true);
    try {
      const v = await api.getVisit(id as string);
      setVisit(v);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !visit) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading visit workspace...</div>;
  }

  const canAccept = visit.status === "scheduled";
  const canCapture = ["initiated", "in_progress"].includes(visit.status);
  const canQc = visit.status === "completed";
  const canFinance = visit.status === "quality_check_completed";
  const canGenerateReport = ["completed", "quality_check_completed", "finance_check_completed"].includes(visit.status);

  const totalExpense = (visit.expenses || []).reduce(
    (s: number, e: any) => s + (parseFloat(e.amount) || 0),
    0
  );

  async function handleAccept() {
    await api.acceptVisit(visit.visit_id);
    loadVisit();
  }

  async function handleSubmitCapture() {
    await api.submitVisit(visit.visit_id, submitForm);
    loadVisit();
  }

  async function handleQC() {
    await api.qualityCheck(visit.visit_id, { status: "approved", comments: qcComment });
    loadVisit();
  }

  async function handleFinance() {
    await api.financeApproval(visit.visit_id, { status: "approved", comments: finComment });
    loadVisit();
  }

  async function handleAddExpense() {
    await api.addExpense(visit.visit_id, {
      ...expenseForm,
      amount: parseFloat(expenseForm.amount) || 0,
    });
    setExpenseForm({ expense_id: `EXP-${Date.now()}`, type: "travel", amount: "", description: "" });
    loadVisit();
  }

  async function handleAddFinding() {
    await api.addFinding(visit.visit_id, findingForm);
    setFindingForm({ finding_id: `F-${Date.now()}`, description: "", severity: "observation", category: "visual" });
    loadVisit();
  }

  async function handleGenerateReport() {
    const r = await api.generateReport(visit.visit_id);
    setAiReport(r);
  }

  async function handleDetectAnomalies() {
    const a = await api.detectAnomalies(visit.visit_id);
    setAnomalies(a);
  }

  // Workflow Pipeline Steps
  const steps = [
    { label: "Scheduled", active: true },
    { label: "Initiated", active: ["initiated", "in_progress", "completed", "quality_check_completed", "finance_check_completed"].includes(visit.status) },
    { label: "Field Completed", active: ["completed", "quality_check_completed", "finance_check_completed"].includes(visit.status) },
    { label: "QC Approved", active: ["quality_check_completed", "finance_check_completed"].includes(visit.status) },
    { label: "Finance Approved", active: visit.status === "finance_check_completed" },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/visits"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Visits List</span>
      </Link>

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-900/60 px-2.5 py-1 rounded-md border border-indigo-700/50">
              {visit.visit_id}
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider badge-indigo">
              {visit.status}
            </span>
          </div>
          <h1 className="text-xl font-extrabold font-heading text-white">
            Job Ref: {visit.job_id}
          </h1>
          <p className="text-xs text-slate-300 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Assigned Inspector:{" "}
            <span className="font-semibold text-white">{visit.inspector_name || "Unassigned"}</span>
          </p>
        </div>

        {/* AI Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canAccept && (
            <button
              onClick={handleAccept}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Accept Visit</span>
            </button>
          )}

          {canGenerateReport && (
            <button
              onClick={handleGenerateReport}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Report</span>
            </button>
          )}

          <button
            onClick={handleDetectAnomalies}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md flex items-center gap-1.5 transition-colors"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>AI Anomaly Check</span>
          </button>
        </div>
      </div>

      {/* Progress Pipeline Stepper */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          Workflow Pipeline Progress
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border text-center text-xs font-semibold flex items-center justify-center gap-1.5 ${
                s.active
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${s.active ? "text-indigo-600" : "text-slate-300"}`} />
              <span className="truncate">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly Alerts Banner */}
      {anomalies && anomalies.flags && anomalies.flags.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider">AI Anomaly Flags Detected</h3>
          </div>
          <div className="space-y-1">
            {anomalies.flags.map((f: any, i: number) => (
              <div key={i} className="text-xs text-rose-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>{f.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-6">
        {[
          { id: "overview", label: "Overview & Controls" },
          { id: "expenses", label: `Expenses (₹${totalExpense.toLocaleString()})` },
          { id: "findings", label: "Findings & Photos" },
          { id: "ai-report", label: "AI Generated Report" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-xs font-bold transition-all relative ${
              activeTab === tab.id
                ? "text-indigo-600 border-b-2 border-indigo-600 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview & Controls */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 font-heading">Visit Parameters</h3>
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Planned Date</span>
                <span className="font-semibold text-slate-800">
                  {visit.planned_date ? new Date(visit.planned_date).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Report Number</span>
                <span className="font-mono font-bold text-slate-800">
                  {visit.inspection_report_no || "Pending Submission"}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Total Expenses</span>
                <span className="font-mono font-bold text-emerald-600">
                  ₹{totalExpense.toLocaleString()}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Invoiced Status</span>
                <span className="font-semibold text-slate-800">
                  {visit.is_invoiced ? "✓ Invoiced" : "Unbilled"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 font-heading">Approval Gate</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex justify-between font-semibold">
                  <span>Quality Check (QC)</span>
                  <span className={visit.quality_check_status === "approved" ? "text-emerald-600" : "text-amber-600"}>
                    {visit.quality_check_status || "Pending"}
                  </span>
                </div>
                {visit.quality_check_comments && (
                  <p className="text-[11px] text-slate-500 mt-1">{visit.quality_check_comments}</p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex justify-between font-semibold">
                  <span>Finance Approval</span>
                  <span className={visit.finance_status === "approved" ? "text-emerald-600" : "text-amber-600"}>
                    {visit.finance_status || "Pending"}
                  </span>
                </div>
                {visit.finance_comments && (
                  <p className="text-[11px] text-slate-500 mt-1">{visit.finance_comments}</p>
                )}
              </div>
            </div>
          </div>

          {/* Form: Data Capture */}
          {canCapture && (
            <div className="p-5 rounded-2xl bg-white border border-indigo-200 shadow-sm col-span-1 md:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-indigo-900 font-heading flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Submit Inspector Visit Data</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Inspection Report No</label>
                  <input
                    value={submitForm.inspection_report_no}
                    onChange={(e) => setSubmitForm({ ...submitForm, inspection_report_no: e.target.value })}
                    placeholder="e.g. REP-2026-001"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Field Comments</label>
                  <textarea
                    value={submitForm.comments}
                    onChange={(e) => setSubmitForm({ ...submitForm, comments: e.target.value })}
                    rows={2}
                    placeholder="Enter site observations..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs mt-1"
                  />
                </div>
              </div>
              <button
                onClick={handleSubmitCapture}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-xs shadow-md flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Submit Visit Log</span>
              </button>
            </div>
          )}

          {/* Form: QC Review */}
          {canQc && (
            <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 shadow-sm col-span-1 md:col-span-2 space-y-3">
              <h3 className="text-sm font-bold text-purple-900 font-heading">Quality Control Signoff</h3>
              <textarea
                value={qcComment}
                onChange={(e) => setQcComment(e.target.value)}
                placeholder="QC review notes..."
                rows={2}
                className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs"
              />
              <button
                onClick={handleQC}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs shadow-md hover:bg-purple-700"
              >
                ✓ Approve QC Check
              </button>
            </div>
          )}

          {/* Form: Finance Review */}
          {canFinance && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm col-span-1 md:col-span-2 space-y-3">
              <h3 className="text-sm font-bold text-emerald-900 font-heading">Finance Review & Approval</h3>
              <textarea
                value={finComment}
                onChange={(e) => setFinComment(e.target.value)}
                placeholder="Finance review notes..."
                rows={2}
                className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs"
              />
              <button
                onClick={handleFinance}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-md hover:bg-emerald-700"
              >
                ✓ Approve Finance Claim
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Expenses */}
      {activeTab === "expenses" && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 font-heading">Inspector Expenses Claimed</h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <select
              value={expenseForm.type}
              onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}
              className="p-2 border border-slate-200 rounded-xl text-xs bg-white"
            >
              <option value="travel">Travel</option>
              <option value="food">Food</option>
              <option value="hotel">Hotel</option>
              <option value="mileage">Mileage</option>
            </select>
            <input
              type="number"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              placeholder="Amount (₹)"
              className="p-2 border border-slate-200 rounded-xl text-xs bg-white w-32"
            />
            <input
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              placeholder="Expense details..."
              className="p-2 border border-slate-200 rounded-xl text-xs bg-white flex-1"
            />
            <button
              onClick={handleAddExpense}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
            >
              Add Expense
            </button>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b">
                <th className="p-3">Type</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(visit.expenses || []).map((e: any) => (
                <tr key={e.expense_id}>
                  <td className="p-3 font-semibold uppercase">{e.type}</td>
                  <td className="p-3 text-slate-600">{e.description || "—"}</td>
                  <td className="p-3 text-right font-mono font-bold text-indigo-600">
                    ₹{parseFloat(e.amount || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: AI Report */}
      {activeTab === "ai-report" && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 font-heading">AI Generated Inspection Report</h3>
            <button
              onClick={handleGenerateReport}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Fresh Report</span>
            </button>
          </div>

          {aiReport ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 font-mono text-slate-700 whitespace-pre-wrap">
                {aiReport.prompt || "Report compiled successfully."}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              Click "Generate Fresh Report" to invoke Gemini AI synthesis.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
