"use client";

import { useEffect, useState } from "react";
import { 
  ArrowDownLeft, Search, Plus, MapPin, X, CheckCircle2, 
  MoreVertical, Edit3, Power, LayoutGrid, LayoutList, RefreshCw, User, UserCheck, Factory, Tag, Globe, Compass, ShieldAlert, ArrowRight, Clock, AlertTriangle, DollarSign, Calendar, FileText, Check
} from "lucide-react";
import { api } from "@/lib/api";

const alphabet = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

export default function AccountsReceivablePage() {
  const [arList, setArList] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [selectedAlpha, setSelectedAlpha] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "overdue" | "settled">("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [loading, setLoading] = useState(true);

  // Manual Entry Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Settlement Modal
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedAr, setSelectedAr] = useState<any | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState("NEFT");
  const [txnRef, setTxnRef] = useState("");

  // Form State
  const [arId, setArId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [invNo, setInvNo] = useState("");
  const [poNo, setPoNo] = useState("");
  const [amount, setAmount] = useState<number>(50000);
  const [termsDays, setTermsDays] = useState<number>(30); // Default 30 days
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAR();
    loadClients();
  }, [search, selectedAlpha, statusFilter]);

  async function loadClients() {
    try {
      const cRes = await api.listClients({ per_page: 200 });
      setClients(cRes.data || []);
    } catch (e) {
      console.warn(e);
    }
  }

  async function loadAR() {
    setLoading(true);
    try {
      const statusParam = statusFilter === "all" ? "" : statusFilter;
      const r = await api.listAccountsReceivable({ 
        search, 
        alpha: selectedAlpha === "ALL" ? "" : selectedAlpha,
        status: statusParam,
        per_page: 200 
      });
      setArList(r.data || []);
    } catch (e) {
      console.error(e);
      // Fallback sample AR entries
      const now = new Date();
      const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
      setArList([
        {
          ar_id: "AR-2026-001",
          client_name: "Reliance Industries Ltd",
          invoice_number: "INV/IQE/2026/001",
          po_number: "PO/RIL/2026/094",
          entry_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          due_date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          payment_terms_days: 30,
          amount: 94400,
          paid_amount: 94400,
          balance_amount: 0,
          status: "settled",
          payment_mode: "NEFT",
          transaction_ref: "TXN981726410",
        },
        {
          ar_id: "AR-2026-002",
          client_name: "L&T Heavy Engineering",
          invoice_number: "INV/IQE/2026/002",
          po_number: "PO/LNT/2026/441",
          entry_date: thirtyFiveDaysAgo.toISOString(),
          due_date: new Date(thirtyFiveDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          payment_terms_days: 30,
          amount: 177000,
          paid_amount: 0,
          balance_amount: 177000,
          status: "overdue",
          overdue_alert: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Calculate metrics
  const totalReceivables = arList.reduce((acc, i) => acc + (i.amount || 0), 0);
  const totalCollected = arList.reduce((acc, i) => acc + (i.paid_amount || 0), 0);
  const totalOutstanding = arList.reduce((acc, i) => acc + (i.balance_amount || 0), 0);
  const overdueList = arList.filter((i) => i.status === "overdue" || i.overdue_alert);
  const totalOverdue = overdueList.reduce((acc, i) => acc + (i.balance_amount || 0), 0);

  const handleOpenAddModal = () => {
    setArId(`AR-2026-${(arList.length + 1).toString().padStart(3, "0")}`);
    setSelectedClientId("");
    setInvNo("");
    setPoNo("");
    setAmount(50000);
    setTermsDays(30); // Default 30-day payment terms
    setShowAddModal(true);
  };

  const handleSaveAR = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const clientObj = clients.find((c) => c.client_id === selectedClientId);

    const payload = {
      ar_id: arId,
      client_id: selectedClientId,
      client_name: clientObj ? clientObj.name : "Custom Client",
      invoice_number: invNo,
      po_number: poNo,
      amount,
      payment_terms_days: termsDays,
    };

    try {
      await api.createAccountReceivable(payload);
      setShowAddModal(false);
      loadAR();
    } catch (e) {
      console.error("Failed to add AR entry", e);
      alert("Failed to add Accounts Receivable entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSettleModal = (ar: any) => {
    setSelectedAr(ar);
    setSettleAmount(ar.balance_amount || ar.amount);
    setPaymentMode("NEFT");
    setTxnRef(`TXN-AR-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setShowSettleModal(true);
    setActiveDropdown(null);
  };

  const handleSaveSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAr) return;

    try {
      await api.recordARSettlement(selectedAr.ar_id, {
        paid_amount: settleAmount,
        payment_mode: paymentMode,
        transaction_ref: txnRef,
      });
      setShowSettleModal(false);
      loadAR();
    } catch (e) {
      console.error("Failed to record settlement", e);
      alert("Failed to record settlement.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Accounts Receivable (AR) — Debtors Ledger</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold font-mono">
              30-Day Payment Terms
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reframed legacy Debtors register: track client billing collections, 30-day payment cycles, manual entry overrides, and automated overdue alerts
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadAR}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            title="Refresh AR Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Receivable Entry</span>
          </button>
        </div>
      </div>

      {/* AUTOMATED OVERDUE ALERT BANNER (If >30 Days Unpaid) */}
      {overdueList.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 shadow-sm flex items-start gap-3 animate-pulse">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <span>Automated Alert: {overdueList.length} Overdue Accounts Receivable (&gt;30 Days)</span>
              </h3>
              <span className="text-xs font-mono font-bold text-rose-800">
                Total Overdue: ₹{totalOverdue.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-rose-800">
              Payments from the following clients have exceeded the mandatory 30-day collection cycle:
              {" "}
              {overdueList.map((a) => `${a.client_name} (₹${a.balance_amount.toLocaleString()})`).join(", ")}.
            </p>
          </div>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Receivables</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold font-mono text-slate-900">₹{totalReceivables.toLocaleString()}</span>
            <ArrowDownLeft className="w-5 h-5 text-blue-500" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Collected Paid</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold font-mono text-emerald-600">₹{totalCollected.toLocaleString()}</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Outstanding</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold font-mono text-amber-600">₹{totalOutstanding.toLocaleString()}</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overdue (&gt;30 Days)</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold font-mono text-rose-600">₹{totalOverdue.toLocaleString()}</span>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
        </div>
      </div>

      {/* Alphabetical A-Z Jump Bar */}
      <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Alphabetical Customer Index</span>
          <span className="text-[11px] font-mono text-blue-600 font-semibold">Filter by Corporate Client initial</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {alphabet.map((letter) => {
            const isActive = selectedAlpha === letter;
            return (
              <button
                key={letter}
                onClick={() => setSelectedAlpha(letter)}
                className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm scale-105"
                    : "bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200/60"
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search, Filter Bar & View Toggle */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by AR Ref (AR-2026-001), Client Name, Invoice No, PO Ref..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === "all" ? "bg-white text-slate-900 font-bold shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All AR Entries
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === "pending" ? "bg-white text-amber-600 font-bold shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter("overdue")}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === "overdue" ? "bg-white text-rose-600 font-bold shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Overdue (&gt;30 Days)
            </button>
            <button
              onClick={() => setStatusFilter("settled")}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === "settled" ? "bg-white text-emerald-600 font-bold shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Settled
            </button>
          </div>

          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-slate-600">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-white text-blue-600 shadow-sm" : "hover:text-slate-900"}`}
              title="Table View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-blue-600 shadow-sm" : "hover:text-slate-900"}`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Directory Content Area */}
      {viewMode === "table" ? (
        /* Data Table View */
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="p-3">AR Ref ID</th>
                  <th className="p-3">Dates &amp; Terms</th>
                  <th className="p-3">Corporate Client</th>
                  <th className="p-3">Invoice / PO Ref</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Collected Amount</th>
                  <th className="p-3">Balance Due</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {arList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No accounts receivable records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  arList.map((ar) => (
                    <tr key={ar.ar_id} className={`hover:bg-slate-50/80 transition-colors ${ar.status === "overdue" || ar.overdue_alert ? "bg-rose-50/40" : ""}`}>
                      <td className="p-3 font-mono font-bold text-blue-600">{ar.ar_id}</td>
                      <td className="p-3 font-mono text-slate-900">
                        <p className="font-bold">{ar.entry_date ? ar.entry_date.split("T")[0] : "N/A"}</p>
                        <p className="text-[10px] text-slate-500">Due: <span className="font-bold text-indigo-700">{ar.due_date ? ar.due_date.split("T")[0] : `+${ar.payment_terms_days || 30} Days`}</span></p>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{ar.client_name}</td>
                      <td className="p-3 font-mono">
                        <p className="font-bold text-indigo-600">{ar.invoice_number || "Manual Entry"}</p>
                        {ar.po_number && <p className="text-[10px] text-slate-400">{ar.po_number}</p>}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">₹{(ar.amount || 0).toLocaleString()}</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">₹{(ar.paid_amount || 0).toLocaleString()}</td>
                      <td className="p-3 font-mono font-extrabold text-rose-600 text-sm">₹{(ar.balance_amount || 0).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ar.status === "settled" ? "bg-emerald-100 text-emerald-800" :
                          ar.status === "overdue" || ar.overdue_alert ? "bg-rose-100 text-rose-800 animate-pulse" : "bg-amber-100 text-amber-800"
                        }`}>
                          {ar.status === "settled" ? "Settled" : ar.status === "overdue" || ar.overdue_alert ? "OVERDUE (>30 Days)" : "Pending"}
                        </span>
                      </td>
                      <td className="p-3 text-right relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === ar.ar_id ? null : ar.ar_id)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Ellipsis Menu */}
                        {activeDropdown === ar.ar_id && (
                          <div className="absolute right-3 top-10 z-20 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-left text-xs space-y-0.5">
                            {ar.status !== "settled" && (
                              <button
                                onClick={() => handleOpenSettleModal(ar)}
                                className="w-full px-3 py-1.5 hover:bg-blue-50 text-blue-700 flex items-center gap-2 font-bold"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Record Collection</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {arList.map((ar) => (
            <div
              key={ar.ar_id}
              className={`p-5 rounded-2xl bg-white border shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between ${
                ar.status === "overdue" || ar.overdue_alert ? "border-rose-300 bg-rose-50/20" : "border-slate-200/80"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                    {ar.ar_id}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    ar.status === "settled" ? "bg-emerald-100 text-emerald-800" :
                    ar.status === "overdue" || ar.overdue_alert ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {ar.status === "settled" ? "Settled" : ar.status === "overdue" || ar.overdue_alert ? "OVERDUE" : "Pending"}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">{ar.client_name}</h3>
                  <p className="text-[11px] font-mono text-indigo-600 font-bold">Invoice: {ar.invoice_number || "Manual Entry"}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                  <p><span className="text-slate-400">Total Invoice:</span> <span className="font-mono font-bold text-slate-900">₹{(ar.amount || 0).toLocaleString()}</span></p>
                  <p><span className="text-slate-400">Balance Due:</span> <span className="font-mono font-extrabold text-rose-600 text-sm">₹{(ar.balance_amount || 0).toLocaleString()}</span></p>
                  <p><span className="text-slate-400">Payment Terms:</span> <span className="font-bold text-indigo-700">{ar.payment_terms_days || 30}-Day Default</span></p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {ar.status !== "settled" && (
                  <button
                    onClick={() => handleOpenSettleModal(ar)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Record Collection</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Manual AR Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Add Accounts Receivable Entry
                </h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAR} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">AR Ref ID *</label>
                  <input
                    type="text"
                    required
                    value={arId}
                    onChange={(e) => setArId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Client *</label>
                  <select
                    required
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="">Select Corporate Client</option>
                    {clients.map((c) => (
                      <option key={c.client_id} value={c.client_id}>
                        {c.name} ({c.client_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Number (Optional)</label>
                  <input
                    type="text"
                    value={invNo}
                    onChange={(e) => setInvNo(e.target.value)}
                    placeholder="INV/IQE/2026/003"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PO / WO Number (Optional)</label>
                  <input
                    type="text"
                    value={poNo}
                    onChange={(e) => setPoNo(e.target.value)}
                    placeholder="PO/RIL/2026/102"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Receivable Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Terms (Days) *</label>
                  <input
                    type="number"
                    required
                    value={termsDays}
                    onChange={(e) => setTermsDays(Number(e.target.value))}
                    placeholder="30"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-indigo-700"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Default is 30 days; override if client contract differs</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !arId || !selectedClientId || !amount}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-sm"
                >
                  {submitting ? "Adding..." : "Add Receivable Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Settlement Sub-Dialog */}
      {showSettleModal && selectedAr && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Record AR Settlement Collection — {selectedAr.ar_id}
                </h2>
              </div>
              <button onClick={() => setShowSettleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettlement} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Collected Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode *</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="NEFT">NEFT Bank Transfer</option>
                  <option value="RTGS">RTGS High-Value Transfer</option>
                  <option value="Cheque">Corporate Cheque</option>
                  <option value="Wire">International Wire</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Transaction Ref Number *</label>
                <input
                  type="text"
                  required
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm"
                >
                  Confirm &amp; Settle Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
