"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.login(username, password);
      router.push("/dashboard");
    } catch {
      setError("Invalid credentials. Check username or password.");
    } finally {
      setLoading(false);
    }
  }

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900/90 backdrop-blur-xl">
        {/* Left Side: Indigo Visual Banner */}
        <div className="relative p-8 md:p-10 gradient-indigo-dark flex flex-col justify-between overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>

          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl gradient-indigo-blue flex items-center justify-center text-white shadow-lg glow-indigo">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-heading text-xl font-bold tracking-tight text-white">
                IQEApp
              </span>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/90 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Inspection Portal</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white font-heading leading-tight">
                Master Code & Quality Engineering
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Streamline inspection workflows, control numbers, field visit logs, QC check signoffs, and invoice generation in a single unified interface.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>FastAPI & MongoDB Beanie engine</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Gemini AI Anomaly & Inspector matching</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white font-heading">Sign In</h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter your inspector or manager credentials below.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Login Name / User ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or inspector1"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-xs shadow-lg glow-indigo hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Shortcuts for Admin, Tenant, and User */}
          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <p className="text-[11px] text-slate-400 mb-2 font-medium">Select Role to Quick Sign In:</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("admin_system", "admin123")}
                className="px-2.5 py-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 text-[11px] text-purple-300 border border-purple-800/50 transition-all font-semibold flex flex-col items-center gap-1"
              >
                <span>🔑 Admin</span>
                <span className="text-[9px] text-purple-400 font-normal">Super Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("tenant_client", "tenant123")}
                className="px-2.5 py-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 text-[11px] text-blue-300 border border-blue-800/50 transition-all font-semibold flex flex-col items-center gap-1"
              >
                <span>🏢 Tenant</span>
                <span className="text-[9px] text-blue-400 font-normal">Client / PM</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("tpi_engineer", "engineer123")}
                className="px-2.5 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-[11px] text-emerald-300 border border-emerald-800/50 transition-all font-semibold flex flex-col items-center gap-1"
              >
                <span>👷 User</span>
                <span className="text-[9px] text-emerald-400 font-normal">TPI Engineer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
