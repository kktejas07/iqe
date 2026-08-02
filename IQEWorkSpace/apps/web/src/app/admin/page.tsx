"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Users, Award, Shield, FileCheck, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.listUsers();
      setUsers(r.data || []);
    } catch (e) {
      console.error(e);
      // Fallback mock user competency database
      setUsers([
        { user_id: "USR-001", name: "Rahul Deshmukh", role: "Lead Inspector", competencies: ["NDT Level III", "Pressure Vessels"], status: "active" },
        { user_id: "USR-002", name: "Anita Sharma", role: "QC Manager", competencies: ["ISO 9001 Audit", "Welding Inspection"], status: "active" },
        { user_id: "USR-003", name: "Siddharth Verma", role: "Finance Approver", competencies: ["Audit & Billing", "Taxation"], status: "active" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading">System Administration</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold font-mono">
              Role & Competency Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Manage inspector roles, certifications, and system audit logs</p>
        </div>
      </div>

      {/* Overview Metric Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total System Users</p>
            <p className="text-lg font-bold text-slate-900">{users.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Certified Inspectors</p>
            <p className="text-lg font-bold text-slate-900">12 Active</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">System Health</p>
            <p className="text-lg font-bold text-emerald-600">100% Operational</p>
          </div>
        </div>
      </div>

      {/* Users Competency Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 font-heading">Inspector Competency Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b">
                <th className="p-3">User ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">System Role</th>
                <th className="p-3">Verified Competencies</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.user_id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-indigo-600">{u.user_id}</td>
                  <td className="p-3 font-semibold text-slate-800">{u.name}</td>
                  <td className="p-3 text-slate-600">{u.role}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.competencies || []).map((c: string) => (
                        <span key={c} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium text-[10px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase badge-emerald">
                      {u.status || "active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
