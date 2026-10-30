"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/feedback";

const inr = (n: number) => "₹" + Number(n).toLocaleString("en-IN");

export default function ApprovalLimitsPage() {
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [level, setLevel] = useState("RH");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setLimits(await api.getApprovalLimits());
      setHistory(await api.getApprovalLimitHistory());
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Could not load the limits");
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    try {
      await api.setApprovalLimit({ level, max_value: Number(amount), reason });
      toast.success("Limit recorded.");
      setAmount(""); setReason("");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Could not set the limit");
    } finally { setBusy(false); }
  }

  const none = Object.keys(limits).length === 0;
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold text-gray-900">Quotation approval limits</h1>
      <p className="mt-1 text-sm text-gray-500">
        The Regional Head issues quotations up to their limit; the MD above it. Only management sets these.
      </p>

      {none && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          No limits are set, so only the MD can issue a quotation.
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {["RH", "MD"].map((l) => (
          <div key={l} className="rounded-lg border bg-white p-4">
            <div className="text-xs font-medium uppercase text-gray-500">{l === "RH" ? "Regional Head" : "Managing Director"}</div>
            <div className="mt-1 text-xl font-semibold">{limits[l] != null ? inr(limits[l]) : "Not set"}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Set a limit</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded border px-2 py-1">
            <option value="RH">Regional Head</option>
            <option value="MD">Managing Director</option>
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Up to (₹)" inputMode="numeric" className="rounded border px-2 py-1" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" className="min-w-[16rem] flex-1 rounded border px-2 py-1" />
          <button onClick={save} disabled={busy || !amount || !reason.trim()} className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50">Save</button>
        </div>
        <p className="mt-2 text-xs text-gray-500">Changing a limit keeps the old one in the history below.</p>
      </div>

      <h2 className="mt-6 font-semibold">History</h2>
      <table className="mt-2 w-full text-sm">
        <thead><tr className="border-b text-left text-gray-500"><th className="py-1">Level</th><th>Limit</th><th>Status</th><th>Set by</th><th>Reason</th></tr></thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.limit_id} className="border-b">
              <td className="py-1">{h.level}</td><td>{inr(h.max_value)}</td><td>{h.status}</td><td>{h.set_by}</td><td>{h.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
