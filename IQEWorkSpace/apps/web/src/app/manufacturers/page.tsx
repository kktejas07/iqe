"use client";

import { useEffect, useState } from "react";
import { Factory, Search, Plus, MapPin, Mail, Phone, X, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";

export default function ManufacturersPage() {
  const [mfrs, setMfrs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [gst, setGst] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, [search]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.listManufacturers({ search, per_page: 200 });
      setMfrs(r.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const nextAutoId = `M-${(mfrs.length + 1).toString().padStart(3, "0")}`;

  const handleAddMfr = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createManufacturer({
        manufacturer_id: nextAutoId,
        name,
        contact_number: contactNumber,
        gst,
      });
      setShowModal(false);
      setName("");
      setContactNumber("");
      setGst("");
      load();
    } catch (err) {
      console.error("Failed to add manufacturer:", err);
      alert("Failed to create manufacturer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Manufacturers & Vendors</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold font-mono">
              {mfrs.length} Vendors
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track equipment manufacturers and vendors entitled with Manufacturer IDs (<span className="font-mono text-amber-700 font-semibold">M-XXX</span>)
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Manufacturer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search manufacturers by ID (e.g. M-005), vendor name, GST..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mfrs.map((m) => (
          <div
            key={m.manufacturer_id}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                  {m.manufacturer_id}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                  Vendor
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-heading">{m.name}</h3>

              <div className="space-y-1 text-xs text-slate-500 pt-1">
                {m.gst && (
                  <p className="text-[11px] font-mono text-slate-600">
                    <span className="text-slate-400 font-sans">GST:</span> {m.gst}
                  </p>
                )}
                {m.contact_number && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {m.contact_number}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Manufacturer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-bold text-slate-900">Add New Manufacturer</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMfr} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Auto-Generated Manufacturer ID
                </label>
                <input
                  type="text"
                  disabled
                  value={nextAutoId}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-amber-50 border border-amber-200 text-amber-900 rounded-xl cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturer Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Heat Exchangers & Vessels"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+91 97000 00000"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GST Number</label>
                <input
                  type="text"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  placeholder="24BBBM2001B1Z0"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Manufacturer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
