import Link from "next/link";
import { Shield, Sparkles, ArrowRight, CheckCircle2, Cpu, FileCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl"></div>

      <div className="max-w-3xl w-full text-center relative z-10 space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-semibold glow-indigo mb-2">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>Next-Gen Quality & Inspection Engine</span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl gradient-indigo-blue flex items-center justify-center text-white shadow-2xl glow-indigo">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold font-heading tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            IQEApp
          </h1>
        </div>

        <p className="text-lg md:text-xl text-slate-400 font-light max-w-xl mx-auto leading-relaxed">
          Ideal Quality Engineers enterprise platform for smart inspection scheduling, automated QC checks, finance approvals, and AI inspector matching.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-left">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <Cpu className="w-5 h-5 text-indigo-400 mb-2" />
            <h3 className="text-sm font-semibold text-white">AI Inspector Match</h3>
            <p className="text-xs text-slate-400 mt-1">Smart competency scoring and assignment optimization.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <FileCheck className="w-5 h-5 text-blue-400 mb-2" />
            <h3 className="text-sm font-semibold text-white">Automated QC & Finance</h3>
            <p className="text-xs text-slate-400 mt-1">End-to-end report approval, expense check, and invoicing.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
            <h3 className="text-sm font-semibold text-white">Real-Time Anomaly Flag</h3>
            <p className="text-xs text-slate-400 mt-1">Instant detection of inspection anomalies & compliance gaps.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white font-semibold shadow-lg glow-indigo hover:scale-[1.02] transition-transform duration-200 flex items-center justify-center gap-2"
          >
            <span>Sign In to Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold border border-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <span>Direct Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
