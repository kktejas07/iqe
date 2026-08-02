"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Plus, Sparkles, User, Briefcase, CalendarCheck, FileText } from "lucide-react";
import { api } from "@/lib/api";

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.aiSearch(query);
      setSearchResults(res.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <div className="relative w-96">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) setSearchResults(null);
            }}
            placeholder="AI Search (jobs, visits, clients)..."
            className="w-full pl-9 pr-10 py-1.5 text-xs bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <button
            type="submit"
            className="absolute right-2 top-1.5 p-1 rounded-md text-indigo-600 hover:bg-indigo-50"
            title="AI Search"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Search Results Dropdown */}
        {searchResults && (
          <div className="absolute top-11 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                AI Search Results
              </span>
              <button
                onClick={() => setSearchResults(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No matching records found.</p>
            ) : (
              <div className="space-y-1.5">
                {searchResults.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSearchResults(null);
                      if (item.type === "job") router.push(`/jobs/${item.id}`);
                      if (item.type === "visit") router.push(`/visits/${item.id}`);
                    }}
                    className="p-2 rounded-lg hover:bg-indigo-50 cursor-pointer text-xs flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{item.title || item.id}</p>
                      <p className="text-[11px] text-slate-500 uppercase">{item.type}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono">
                      {item.status || "view"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-3">
        {/* AI Assistant Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Gemini Copilot Active</span>
        </div>

        {/* Quick New Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-semibold hover:opacity-95 transition-opacity shadow-sm glow-indigo"
          >
            <Plus className="w-4 h-4" />
            <span>Create</span>
          </button>

          {showQuickMenu && (
            <div className="absolute right-0 top-10 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50">
              <Link
                href="/jobs/new"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"
              >
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                <span>New Job</span>
              </Link>
              <Link
                href="/visits/new"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>Schedule Visit</span>
              </Link>
              <Link
                href="/invoices/new"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"
              >
                <FileText className="w-3.5 h-3.5 text-purple-500" />
                <span>Generate Invoice</span>
              </Link>
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-indigo-600 absolute top-2 right-2 ring-2 ring-white"></span>
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 text-indigo-700 font-bold flex items-center justify-center border border-indigo-200">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-bold text-slate-800 leading-none">Ideal Quality</p>
            <p className="text-[10px] text-slate-500 leading-tight">Admin Portal</p>
          </div>
        </div>
      </div>
    </header>
  );
}
