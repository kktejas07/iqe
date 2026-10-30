"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/feedback";

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function MyPayslipsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.myPayslips();
        setItems(res.items ?? []);
      } catch (e: any) {
        toast.error(e?.response?.data?.detail ?? "Could not load your payslips");
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-gray-900">My payslips</h1>
      <p className="mt-1 text-sm text-gray-500">Only your own, and only once the month&apos;s payroll has been paid out.</p>
      {loading ? <p className="mt-6 text-gray-400">Loading…</p> : items.length === 0 ? (
        <p className="mt-6 text-gray-500">No released payslips yet.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500"><th className="py-1">Month</th><th>Gross</th><th>Deductions</th><th>Net</th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.payslip_id} className="border-b">
                <td className="py-1">{MONTHS[p.period_month - 1]} {p.period_year}</td>
                <td>{inr(p.gross_salary)}</td><td>{inr(p.total_deductions)}</td>
                <td className="font-medium">{inr(p.net_salary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
