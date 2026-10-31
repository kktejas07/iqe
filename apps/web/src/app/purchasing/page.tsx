"use client";

import { useEffect, useState } from "react";
import { Search, Plus, RefreshCw, X, Clock, ShoppingCart, AlertTriangle } from "@/components/icons";
import { api } from "@/lib/api";
import { toast } from "@/components/feedback";

type Tab = "requisitions" | "vendor_bills" | "vendors" | "msme_alerts";

const inr = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const rows = (res: any): any[] => (Array.isArray(res) ? res : res?.data ?? res?.items ?? []);
const why = (e: any, fallback: string) => {
  const d = e?.response?.data?.detail;
  return typeof d === "string" ? d : fallback;
};

function pill(s: string) {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700", pending_approval: "bg-yellow-100 text-yellow-800",
    pending: "bg-yellow-100 text-yellow-800", approved: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-700", paid: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-500",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || "bg-gray-100 text-gray-600"}`}>{s?.replace(/_/g, " ")}</span>;
}

const th = "px-4 py-3 text-left";
const input = "w-full px-3 py-2 border rounded-lg text-sm";
const TDS = ["", "NONE", "194C", "194J", "194J_TECH", "194H"];

function Modal({ title, onClose, onSubmit, busy, children, submitLabel }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={onSubmit} className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{busy ? "Saving..." : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}

const Field = ({ label, children, wide }: any) => (
  <div className={wide ? "col-span-2" : ""}><label className="block text-xs font-medium mb-1">{label}</label>{children}</div>
);

export default function PurchasingPage() {
  const [items, setItems] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("requisitions");
  const [modal, setModal] = useState<"" | "requisition" | "bill" | "vendor" | "pay">("");
  const [busy, setBusy] = useState(false);

  const [req, setReq] = useState({ purpose: "", vendor_name: "", total_amount: 0, is_msme: false });
  const [vend, setVend] = useState<any>({ name: "", vendor_type: "manufacturer", pan: "", gstin: "", default_tds_section: "", is_msme: false, msme_category: "small", udyam_number: "", lower_rate_pct: "", lower_cert_ref: "" });
  const [bill, setBill] = useState<any>({ vendor_id: "", vendor_name: "", pan: "", gstin: "", invoice_number: "", invoice_date: "", taxable_value: "", gst_rate_pct: "18", tds_section: "", reverse_charge: false, acceptance_date: "", written_agreement_days: "", job_id: "" });
  const [pay, setPay] = useState<any>({ id: "", payment_mode: "NEFT", payment_ref: "" });

  useEffect(() => { load(); }, [tab, search]);
  useEffect(() => { api.listVendors().then((r: any) => setVendors(rows(r))).catch(() => {}); }, []);

  async function load() {
    setLoading(true);
    try {
      let res: any;
      if (tab === "requisitions") res = await api.listRequisitions({ search });
      else if (tab === "vendor_bills") res = await api.listVendorPayments({ search });
      else if (tab === "vendors") res = await api.listVendors({ search });
      else res = await api.msmeAlerts();
      setItems(rows(res));
      if (tab === "vendors") setVendors(rows(res));
    } catch (e: any) { toast.error(why(e, "Failed to load data")); }
    setLoading(false);
  }

  async function approve(id: string, kind: "req" | "bill") {
    try {
      if (kind === "req") await api.approveRequisition(id); else await api.approveVendorPayment(id);
      toast.success("Approved");
      load();
    } catch (e: any) { toast.error(why(e, "Approval failed")); }
  }

  async function save(fn: () => Promise<any>, done: string) {
    setBusy(true);
    try { const r = await fn(); toast.success(done); setModal(""); load(); return r; }
    catch (e: any) { toast.error(why(e, "That was refused")); }
    finally { setBusy(false); }
  }

  const chosen = vendors.find(v => v.vendor_id === bill.vendor_id);
  const needsAcceptance = !!chosen?.is_msme && ["micro", "small"].includes(chosen.msme_category);

  function submitBill(e: React.FormEvent) {
    e.preventDefault();
    const body: any = {
      invoice_number: bill.invoice_number || undefined,
      invoice_date: bill.invoice_date || undefined,
      taxable_value: Number(bill.taxable_value),
      gst_rate_pct: Number(bill.gst_rate_pct || 0),
      reverse_charge: bill.reverse_charge,
      tds_section: bill.tds_section || undefined,
      job_id: bill.job_id || undefined,
    };
    if (bill.vendor_id) body.vendor_id = bill.vendor_id;
    else { body.vendor_name = bill.vendor_name; body.pan = bill.pan || undefined; body.gstin = bill.gstin || undefined; }
    if (needsAcceptance) {
      body.acceptance_date = bill.acceptance_date;
      if (bill.written_agreement_days) body.written_agreement_days = Number(bill.written_agreement_days);
    }
    save(async () => {
      const r = await api.createVendorPayment(body);
      toast.success(`Entered ${r.vp_id}: TDS ${inr(r.tds_deducted)}, net payable ${inr(r.net_payable)}`);
      return r;
    }, "Vendor bill entered");
  }

  function submitVendor(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { ...vend };
    for (const k of ["pan", "gstin", "default_tds_section", "udyam_number", "lower_cert_ref"]) if (!body[k]) delete body[k];
    if (body.lower_rate_pct === "") delete body.lower_rate_pct; else body.lower_rate_pct = Number(body.lower_rate_pct);
    if (!body.is_msme) { delete body.msme_category; delete body.udyam_number; }
    save(() => api.createVendor(body), "Vendor saved");
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "requisitions", label: "Requisitions" },
    { key: "vendor_bills", label: "Vendor Bills" },
    { key: "vendors", label: "Vendors" },
    { key: "msme_alerts", label: "MSME Alerts" },
  ];
  const action = tab === "requisitions" ? ["requisition", "New Requisition"] : tab === "vendor_bills" ? ["bill", "Enter Vendor Bill"] : tab === "vendors" ? ["vendor", "New Vendor"] : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><ShoppingCart size={28} /> Purchasing &amp; Vendor Payments</h1>
          <p className="text-sm text-gray-500 mt-1">Requisitions, vendor bills with GST and TDS worked out for you, the vendor register, and MSME due dates</p>
        </div>
        {action && (
          <button onClick={() => setModal(action[0] as any)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={16} /> {action[1]}</button>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{t.label}</button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800" />
        </div>
        <button onClick={load} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"><RefreshCw size={16} /></button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400"><Clock size={24} className="animate-spin mr-2" /> Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No records found</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {tab === "requisitions" && <tr><th className={th}>ID</th><th className={th}>Purpose</th><th className={th}>Vendor</th><th className={th}>Amount</th><th className={th}>MSME</th><th className={th}>Status</th><th className={th}>Actions</th></tr>}
              {tab === "vendor_bills" && <tr><th className={th}>ID</th><th className={th}>Vendor</th><th className={th}>Invoice</th><th className={th}>Taxable</th><th className={th}>GST</th><th className={th}>TDS</th><th className={th}>Net payable</th><th className={th}>Due</th><th className={th}>Status</th><th className={th}>Actions</th></tr>}
              {tab === "vendors" && <tr><th className={th}>ID</th><th className={th}>Name</th><th className={th}>PAN</th><th className={th}>GSTIN</th><th className={th}>TDS</th><th className={th}>MSME</th></tr>}
              {tab === "msme_alerts" && <tr><th className={th}>Bill</th><th className={th}>Vendor</th><th className={th}>Amount</th><th className={th}>Due</th><th className={th}>Days left</th><th className={th}>Severity</th></tr>}
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((it: any, i: number) => (
                <tr key={it.vp_id || it.vendor_id || it.requisition_id || i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  {tab === "requisitions" && (<>
                    <td className="px-4 py-3 font-mono text-xs">{it.requisition_id}</td>
                    <td className="px-4 py-3">{it.purpose}</td>
                    <td className="px-4 py-3">{it.vendor_name || "—"}</td>
                    <td className="px-4 py-3 font-mono">{inr(it.total_amount)}</td>
                    <td className="px-4 py-3">{it.is_msme ? <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">MSME</span> : "—"}</td>
                    <td className="px-4 py-3">{pill(it.status)}</td>
                    <td className="px-4 py-3">{["draft", "pending_approval"].includes(it.status) && <button onClick={() => approve(it.requisition_id, "req")} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Approve</button>}</td>
                  </>)}
                  {tab === "vendor_bills" && (<>
                    <td className="px-4 py-3 font-mono text-xs">{it.vp_id}</td>
                    <td className="px-4 py-3">{it.vendor_name}{it.pan ? <div className="text-xs text-gray-400">{it.pan}</div> : null}</td>
                    <td className="px-4 py-3">{it.invoice_number || "—"}</td>
                    <td className="px-4 py-3 font-mono">{inr(it.taxable_value)}</td>
                    <td className="px-4 py-3 font-mono">{inr(it.gst_total)}</td>
                    <td className="px-4 py-3 font-mono" title={it.tds_note || ""}>{inr(it.tds_deducted)}{it.tds_section ? <div className="text-xs text-gray-400">{it.tds_section} @ {it.tds_rate_pct}%</div> : null}</td>
                    <td className="px-4 py-3 font-mono font-semibold">{inr(it.net_payable)}</td>
                    <td className="px-4 py-3">{it.due_date?.slice(0, 10) || "—"}</td>
                    <td className="px-4 py-3">{pill(it.status)}</td>
                    <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                      {it.status === "pending" && <button onClick={() => approve(it.vp_id, "bill")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Approve</button>}
                      {it.status === "approved" && <button onClick={() => { setPay({ id: it.vp_id, payment_mode: "NEFT", payment_ref: "" }); setModal("pay"); }} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Pay</button>}
                      {it.status === "paid" && it.msme_late_days > 0 && <span className="text-xs text-red-600">{it.msme_late_days}d late · interest {inr(it.msme_interest)}</span>}
                    </td>
                  </>)}
                  {tab === "vendors" && (<>
                    <td className="px-4 py-3 font-mono text-xs">{it.vendor_id}</td>
                    <td className="px-4 py-3">{it.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{it.pan || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{it.gstin || "—"}</td>
                    <td className="px-4 py-3">{it.default_tds_section || "—"}{it.lower_rate_pct != null ? ` · ${it.lower_rate_pct}% cert` : ""}</td>
                    <td className="px-4 py-3">{it.is_msme ? <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">{it.msme_category}</span> : "—"}</td>
                  </>)}
                  {tab === "msme_alerts" && (<>
                    <td className="px-4 py-3 font-mono text-xs">{it.vp_id}</td>
                    <td className="px-4 py-3 font-semibold">{it.vendor_name}</td>
                    <td className="px-4 py-3 font-mono">{inr(it.amount)}</td>
                    <td className="px-4 py-3">{it.due_date?.slice(0, 10)}</td>
                    <td className={`px-4 py-3 font-semibold ${it.days_remaining < 0 ? "text-red-600" : ""}`}>{it.days_remaining}d</td>
                    <td className="px-4 py-3">{it.severity === "critical" ? <AlertTriangle size={16} className="text-red-500" /> : <Clock size={16} className="text-yellow-500" />}</td>
                  </>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === "requisition" && (
        <Modal title="New Purchase Requisition" onClose={() => setModal("")} busy={busy} submitLabel="Create"
          onSubmit={(e: any) => { e.preventDefault(); save(() => api.createRequisition(req), "Requisition created"); }}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Purpose" wide><input required value={req.purpose} onChange={e => setReq({ ...req, purpose: e.target.value })} className={input} /></Field>
            <Field label="Vendor name"><input required value={req.vendor_name} onChange={e => setReq({ ...req, vendor_name: e.target.value })} className={input} /></Field>
            <Field label="Amount (₹)"><input type="number" min={0} value={req.total_amount} onChange={e => setReq({ ...req, total_amount: +e.target.value })} className={input} /></Field>
            <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={req.is_msme} onChange={e => setReq({ ...req, is_msme: e.target.checked })} /> MSME vendor</label>
          </div>
        </Modal>
      )}

      {modal === "vendor" && (
        <Modal title="New Vendor" onClose={() => setModal("")} busy={busy} submitLabel="Save vendor" onSubmit={submitVendor}>
          <p className="text-xs text-gray-500">PAN, GSTIN and MSME status are held here once. Every bill to this vendor takes them from this record.</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" wide><input required value={vend.name} onChange={e => setVend({ ...vend, name: e.target.value })} className={input} /></Field>
            <Field label="PAN"><input value={vend.pan} onChange={e => setVend({ ...vend, pan: e.target.value.toUpperCase() })} maxLength={10} className={input} /></Field>
            <Field label="GSTIN"><input value={vend.gstin} onChange={e => setVend({ ...vend, gstin: e.target.value.toUpperCase() })} maxLength={15} className={input} /></Field>
            <Field label="Usual TDS section">
              <select value={vend.default_tds_section} onChange={e => setVend({ ...vend, default_tds_section: e.target.value })} className={input}>{TDS.map(t => <option key={t} value={t}>{t || "Not set"}</option>)}</select>
            </Field>
            <Field label="Type">
              <select value={vend.vendor_type} onChange={e => setVend({ ...vend, vendor_type: e.target.value })} className={input}>
                <option value="manufacturer">Manufacturer</option><option value="sub_contractor">Sub-contractor</option><option value="inspector">Inspector</option><option value="other">Other</option>
              </select>
            </Field>
            <Field label="Lower deduction rate % (certificate)"><input type="number" step="0.01" value={vend.lower_rate_pct} onChange={e => setVend({ ...vend, lower_rate_pct: e.target.value })} className={input} /></Field>
            <Field label="Certificate reference"><input value={vend.lower_cert_ref} onChange={e => setVend({ ...vend, lower_cert_ref: e.target.value })} className={input} /></Field>
            <label className="flex items-center gap-2 text-xs font-medium col-span-2"><input type="checkbox" checked={vend.is_msme} onChange={e => setVend({ ...vend, is_msme: e.target.checked })} /> Micro, small or medium enterprise</label>
            {vend.is_msme && (<>
              <Field label="Category"><select value={vend.msme_category} onChange={e => setVend({ ...vend, msme_category: e.target.value })} className={input}><option value="micro">Micro</option><option value="small">Small</option><option value="medium">Medium</option></select></Field>
              <Field label="Udyam number"><input value={vend.udyam_number} onChange={e => setVend({ ...vend, udyam_number: e.target.value.toUpperCase() })} placeholder="UDYAM-XX-00-0000000" className={input} /></Field>
            </>)}
          </div>
        </Modal>
      )}

      {modal === "bill" && (
        <Modal title="Enter Vendor Bill" onClose={() => setModal("")} busy={busy} submitLabel="Enter bill" onSubmit={submitBill}>
          <p className="text-xs text-gray-500">Enter the bill as it was issued. GST heads and TDS are worked out by the server from the vendor record; they are not typed.</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vendor" wide>
              <select value={bill.vendor_id} onChange={e => setBill({ ...bill, vendor_id: e.target.value })} className={input}>
                <option value="">One-off (no vendor record)</option>
                {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.name} {v.pan ? `· ${v.pan}` : ""}</option>)}
              </select>
            </Field>
            {chosen ? (
              <div className="col-span-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-600">
                PAN {chosen.pan || "none"} · GSTIN {chosen.gstin || "none"} · usual TDS {chosen.default_tds_section || "not set"}{chosen.is_msme ? ` · ${chosen.msme_category} enterprise` : ""}
              </div>
            ) : (<>
              <Field label="Vendor name"><input required value={bill.vendor_name} onChange={e => setBill({ ...bill, vendor_name: e.target.value })} className={input} /></Field>
              <Field label="PAN"><input value={bill.pan} onChange={e => setBill({ ...bill, pan: e.target.value.toUpperCase() })} maxLength={10} className={input} /></Field>
              <Field label="GSTIN"><input value={bill.gstin} onChange={e => setBill({ ...bill, gstin: e.target.value.toUpperCase() })} maxLength={15} className={input} /></Field>
            </>)}
            <Field label="Invoice number"><input value={bill.invoice_number} onChange={e => setBill({ ...bill, invoice_number: e.target.value })} className={input} /></Field>
            <Field label="Invoice date"><input type="date" value={bill.invoice_date} onChange={e => setBill({ ...bill, invoice_date: e.target.value })} className={input} /></Field>
            <Field label="Taxable value (₹, before GST)"><input required type="number" min={0.01} step="0.01" value={bill.taxable_value} onChange={e => setBill({ ...bill, taxable_value: e.target.value })} className={input} /></Field>
            <Field label="GST rate %">
              <select value={bill.gst_rate_pct} onChange={e => setBill({ ...bill, gst_rate_pct: e.target.value })} className={input}>{[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}</select>
            </Field>
            <Field label="TDS section">
              <select value={bill.tds_section} onChange={e => setBill({ ...bill, tds_section: e.target.value })} className={input}>
                {TDS.map(t => <option key={t} value={t}>{t === "" ? (chosen ? `Vendor's usual (${chosen.default_tds_section || "none"})` : "None") : t}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={bill.reverse_charge} onChange={e => setBill({ ...bill, reverse_charge: e.target.checked })} /> GST on reverse charge</label>
            {needsAcceptance && (<>
              <Field label="Goods or services accepted on"><input required type="date" value={bill.acceptance_date} onChange={e => setBill({ ...bill, acceptance_date: e.target.value })} className={input} /></Field>
              <Field label="Agreed payment days (max 45)"><input type="number" min={1} max={45} value={bill.written_agreement_days} onChange={e => setBill({ ...bill, written_agreement_days: e.target.value })} className={input} /></Field>
            </>)}
            <Field label="Job (optional)" wide><input value={bill.job_id} onChange={e => setBill({ ...bill, job_id: e.target.value })} className={input} /></Field>
          </div>
        </Modal>
      )}

      {modal === "pay" && (
        <Modal title={`Pay ${pay.id}`} onClose={() => setModal("")} busy={busy} submitLabel="Release payment"
          onSubmit={(e: any) => { e.preventDefault(); save(() => api.payVendorPayment(pay.id, { payment_mode: pay.payment_mode, payment_ref: pay.payment_ref }), "Payment recorded"); }}>
          <p className="text-xs text-gray-500">Money is released by someone other than the person who approved the bill.</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mode"><select value={pay.payment_mode} onChange={e => setPay({ ...pay, payment_mode: e.target.value })} className={input}><option>NEFT</option><option>RTGS</option><option>UPI</option><option>Cheque</option></select></Field>
            <Field label="Reference"><input required value={pay.payment_ref} onChange={e => setPay({ ...pay, payment_ref: e.target.value })} className={input} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
