"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Filter, Plus, DollarSign, Building, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
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
      const r = await api.listInvoices(params);
      setInvoices(r.data || []);
      setTotal(r.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const grandTotalAmount = invoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Inspection Invoices</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold font-mono">
              {total}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Billing ledger and client invoice statements</p>
        </div>

        <Link
          href="/invoices/new"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs shadow-lg glow-indigo hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Invoice</span>
        </Link>
      </div>

      {/* Financial Overview Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 text-purple-300 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Billed Portfolio</p>
            <p className="text-2xl font-extrabold font-mono text-white">
              ₹{grandTotalAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:w-64">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          >
            <option value="">All Invoice Statuses</option>
            <option value="draft">Draft</option>
            <option value="initiated">Initiated</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="paid">Paid</option>
          </select>
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">No invoices generated yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80">
                  <th className="p-4">Invoice Number</th>
                  <th className="p-4">Client Name</th>
                  <th className="p-4">Billing Type</th>
                  <th className="p-4">Grand Total</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.invoice_id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600">{inv.invoice_number}</td>
                    <td className="p-4 text-slate-800 font-medium">
                      {inv.client_name || "Standard Client"}
                    </td>
                    <td className="p-4 text-slate-500 uppercase">{inv.invoice_type || "Inspection"}</td>
                    <td className="p-4 font-mono font-bold text-slate-900">
                      ₹{(inv.grand_total || 0).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          inv.status === "paid"
                            ? "badge-emerald"
                            : inv.status === "cancelled"
                            ? "badge-rose"
                            : inv.frozen
                            ? "badge-indigo"
                            : "badge-purple"
                        }`}
                      >
                        {inv.frozen ? "Frozen" : inv.status}
                      </span>
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
