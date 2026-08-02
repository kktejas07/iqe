"use client";

import { useEffect, useState } from "react";
import { Building2, Search, Plus, MapPin, Mail, Phone, X, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State for Add Client
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("Oil & Gas");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, [search]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.listClients({ search, per_page: 200 });
      setClients(r.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const nextAutoId = `C-${(clients.length + 1).toString().padStart(3, "0")}`;

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createClient({
        client_id: nextAutoId,
        name,
        city,
        contact_person: contactPerson,
        email,
        phone,
        industry_type: industry,
      });
      setShowModal(false);
      setName("");
      setCity("");
      setContactPerson("");
      setEmail("");
      setPhone("");
      load();
    } catch (err) {
      console.error("Failed to add client:", err);
      alert("Failed to create client.");
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
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Client Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold font-mono">
              {clients.length} Clients
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage corporate clients with auto-generated Client IDs (<span className="font-mono text-indigo-600 font-semibold">C-XXX</span>)
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by ID (e.g. C-014), company name, city, email..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {clients.map((c) => (
          <div
            key={c.client_id}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                  {c.client_id}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase badge-emerald">
                  {c.is_active !== false ? "Active" : "Inactive"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-heading">{c.name}</h3>

              <div className="space-y-1 text-xs text-slate-500 pt-1">
                {c.industry_type && (
                  <p className="text-[11px] font-medium text-slate-600">
                    <span className="text-slate-400">Industry:</span> {c.industry_type}
                  </p>
                )}
                {c.city && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.city}, {c.state || "India"}
                  </p>
                )}
                {c.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.email}
                  </p>
                )}
                {c.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Add New Client</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Auto-Generated Client ID
                </label>
                <input
                  type="text"
                  disabled
                  value={nextAutoId}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Heavy Engineering Ltd"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Industry Type</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Oil & Gas">Oil & Gas</option>
                    <option value="Power Generation">Power Generation</option>
                    <option value="Petrochemicals">Petrochemicals</option>
                    <option value="Heavy Fabrication">Heavy Fabrication</option>
                    <option value="Offshore & Marine">Offshore & Marine</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@company.com"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 00000"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
