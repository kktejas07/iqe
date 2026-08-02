"use client";

import { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Edit3,
  Building2,
  HardHat,
  Calendar,
  Layers,
  Save,
  Printer,
  ChevronDown,
  X,
  Clock,
  Eye,
} from "lucide-react";

interface BillItem {
  slNo: number;
  raBill: string;
  date: string;
  boqItem: string;
  description: string;
  unit: string;
  gfcDrawingRef: string;
  boqQty: number;
  prevCertifiedQty: number;
  contractorClaimedQty: number;
  tpiVerifiedQty: number;
  unitRate: number;
  isVariation: "Y" | "N";
  variationRef: string;
  contractClause: string;
  isHiddenWork: "Y" | "N";
  measurementType: string;
  observation: string;
  actionRequired: string;
  targetDate: string;
  closureStatus: "Open" | "Pending Verification" | "Closed";
  attachments: string;
}

const INITIAL_ITEMS: BillItem[] = [
  {
    slNo: 1,
    raBill: "001",
    date: "2026-08-02",
    boqItem: "1.01",
    description: "Elbows 90 Deg SS316 4-inch Heavy Duty",
    unit: "No's",
    gfcDrawingRef: "BOM-101",
    boqQty: 10,
    prevCertifiedQty: 5,
    contractorClaimedQty: 10,
    tpiVerifiedQty: 10,
    unitRate: 100,
    isVariation: "Y",
    variationRef: "VAR-001",
    contractClause: "Clause 14.2",
    isHiddenWork: "N",
    measurementType: "Physical Measurement",
    observation: "Verified at site. 100% physically inspected and countersigned.",
    actionRequired: "Proceed for payment authorization",
    targetDate: "2026-08-05",
    closureStatus: "Closed",
    attachments: "Bill_Inv_001.pdf",
  },
  {
    slNo: 2,
    raBill: "001",
    date: "2026-08-02",
    boqItem: "3.04",
    description: "SWTN Piping Socket Weld Threaded Nipple",
    unit: "No's",
    gfcDrawingRef: "BOM-102",
    boqQty: 100,
    prevCertifiedQty: 50,
    contractorClaimedQty: 50,
    tpiVerifiedQty: 50,
    unitRate: 1,
    isVariation: "N",
    variationRef: "N/A",
    contractClause: "Clause-1",
    isHiddenWork: "Y",
    measurementType: "Joint Measurement",
    observation: "Concealed work offered prior to covering. Joint measurement report verified.",
    actionRequired: "Approved for billing",
    targetDate: "2026-08-04",
    closureStatus: "Closed",
    attachments: "Joint_Msrmt_Report_02.pdf",
  },
  {
    slNo: 3,
    raBill: "001",
    date: "2026-08-02",
    boqItem: "6.12",
    description: "Carbon Steel Seamless Pipes 6-inch Sch 40",
    unit: "Mtrs",
    gfcDrawingRef: "DWG-CS-401",
    boqQty: 500,
    prevCertifiedQty: 200,
    contractorClaimedQty: 150,
    tpiVerifiedQty: 120,
    unitRate: 1450,
    isVariation: "N",
    variationRef: "N/A",
    contractClause: "Clause 8.1",
    isHiddenWork: "N",
    measurementType: "Ultrasonic Thickness Test",
    observation: "Contractor claimed 150m, but 30m was not laid per GFC revision. Verified payable: 120m.",
    actionRequired: "Contractor to submit revised as-built drawing for 30m delta",
    targetDate: "2026-08-10",
    closureStatus: "Open",
    attachments: "UT_Test_Cert_612.pdf",
  },
  {
    slNo: 4,
    raBill: "001",
    date: "2026-08-02",
    boqItem: "8.02",
    description: "Structural Support Steel Fabrication & Erection",
    unit: "Kgs",
    gfcDrawingRef: "DWG-ST-009",
    boqQty: 2500,
    prevCertifiedQty: 1000,
    contractorClaimedQty: 800,
    tpiVerifiedQty: 800,
    unitRate: 85,
    isVariation: "N",
    variationRef: "N/A",
    contractClause: "Clause 11.4",
    isHiddenWork: "N",
    measurementType: "Weight Reconciliation",
    observation: "Weight verified against mill test certificates and physical measurements.",
    actionRequired: "None. Verified.",
    targetDate: "2026-08-03",
    closureStatus: "Closed",
    attachments: "Mill_Cert_Steel_802.pdf",
  },
  {
    slNo: 5,
    raBill: "001",
    date: "2026-08-02",
    boqItem: "10.05",
    description: "Epoxy Primer Coating & Fireproofing Paint",
    unit: "Ltrs",
    gfcDrawingRef: "SPEC-COAT-03",
    boqQty: 400,
    prevCertifiedQty: 150,
    contractorClaimedQty: 100,
    tpiVerifiedQty: 80,
    unitRate: 650,
    isVariation: "Y",
    variationRef: "VAR-003",
    contractClause: "Clause 15.1",
    isHiddenWork: "N",
    measurementType: "DFT Gauge Inspection",
    observation: "WFT/DFT gauge test showed under-thickness in Zone B. 20 Ltrs rejected until recoating.",
    actionRequired: "Contractor to re-apply topcoat in Zone B",
    targetDate: "2026-08-08",
    closureStatus: "Pending Verification",
    attachments: "DFT_Report_ZoneB.pdf",
  },
];

export default function TPIBillingPage() {
  const [items, setItems] = useState<BillItem[]>(INITIAL_ITEMS);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingItem, setEditingItem] = useState<BillItem | null>(null);
  const [showDeliverablesModal, setShowDeliverablesModal] = useState<boolean>(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<string>("Payment Recommendation Note");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Compute calculated metrics
  const processedItems = useMemo(() => {
    return items.map((item) => {
      const balanceQty = item.boqQty - item.prevCertifiedQty;
      const diffQty = item.contractorClaimedQty - item.tpiVerifiedQty;
      const claimedAmt = item.contractorClaimedQty * item.unitRate;
      const recommendedAmt = item.tpiVerifiedQty * item.unitRate;
      let status: "Accepted" | "Over Claimed" | "Under Claimed" = "Accepted";
      if (diffQty > 0) status = "Over Claimed";
      else if (diffQty < 0) status = "Under Claimed";

      return {
        ...item,
        balanceQty,
        diffQty,
        claimedAmt,
        recommendedAmt,
        status,
      };
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    return processedItems.filter((item) => {
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;
      const matchesSearch =
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.boqItem.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.gfcDrawingRef.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [processedItems, statusFilter, searchQuery]);

  // Overall Financial & Audit Summary
  const totalClaimedAmount = useMemo(
    () => processedItems.reduce((acc, curr) => acc + curr.claimedAmt, 0),
    [processedItems]
  );
  const totalRecommendedAmount = useMemo(
    () => processedItems.reduce((acc, curr) => acc + curr.recommendedAmt, 0),
    [processedItems]
  );
  const totalSavingsVariance = totalClaimedAmount - totalRecommendedAmount;
  const overClaimedCount = processedItems.filter((i) => i.status === "Over Claimed").length;

  const handleUpdateItem = (updated: BillItem) => {
    setItems((prev) => prev.map((i) => (i.slNo === updated.slNo ? updated : i)));
    setEditingItem(null);
  };

  const handleAddItem = () => {
    const newItem: BillItem = {
      slNo: items.length + 1,
      raBill: "001",
      date: new Date().toISOString().split("T")[0],
      boqItem: `${items.length + 1}.01`,
      description: "New Verified BOQ Line Item",
      unit: "No's",
      gfcDrawingRef: "DWG-NEW-01",
      boqQty: 100,
      prevCertifiedQty: 0,
      contractorClaimedQty: 50,
      tpiVerifiedQty: 50,
      unitRate: 500,
      isVariation: "N",
      variationRef: "N/A",
      contractClause: "Clause 1.0",
      isHiddenWork: "N",
      measurementType: "Physical",
      observation: "Initial measurement log created.",
      actionRequired: "Verification complete",
      targetDate: "2026-08-15",
      closureStatus: "Closed",
      attachments: "Doc_Attachment.pdf",
    };
    setItems([...items, newItem]);
  };

  const handleSaveState = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading">
              TPI Bill Verification Master
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
              RA Bill 001
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
              ISO 17020 Compliant
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Independent Third-Party Quantity & Measurement Audit Platform • Scope: Rao (TPI Engineer)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSaveState}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5 text-indigo-400" />
            <span>{savedSuccess ? "Saved to Ledger!" : "Save Verification State"}</span>
          </button>

          <button
            onClick={() => setShowDeliverablesModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-xs shadow-lg glow-indigo hover:opacity-95 transition-all flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-white" />
            <span>Generate TPI Deliverables (7 Reports)</span>
          </button>
        </div>
      </div>

      {/* Metadata Card: Project & Contract Info */}
      <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-400 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Project & Client</p>
            <p className="font-bold text-white truncate">Global Petrochem Phase 2</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-700/50 flex items-center justify-center text-blue-400 shrink-0">
            <HardHat className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Contractor</p>
            <p className="font-bold text-white truncate">Apex Heavy Engg Corp</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Contract & TPI Engineer</p>
            <p className="font-bold text-white truncate">PO/2026/TPI-8890 (Rao TPI)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-700/50 flex items-center justify-center text-amber-400 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Bill Period & Date</p>
            <p className="font-bold text-white truncate">RA-001 (Aug 02, 2026)</p>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold">Contractor Claimed Total</p>
            <p className="text-xl font-extrabold font-mono text-slate-900 mt-1">
              ₹{totalClaimedAmount.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">RA Bill Claim Amount</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            ₹
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-700 font-semibold">TPI Recommended Payable</p>
            <p className="text-xl font-extrabold font-mono text-emerald-600 mt-1">
              ₹{totalRecommendedAmount.toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-700/80 mt-0.5">Verified Execution Value</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-rose-700 font-semibold">Over-Claim Variance / Savings</p>
            <p className="text-xl font-extrabold font-mono text-rose-600 mt-1">
              ₹{totalSavingsVariance.toLocaleString()}
            </p>
            <p className="text-[10px] text-rose-700/80 mt-0.5">Prevented Excess Claims</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-indigo-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-indigo-700 font-semibold">Discrepancy Audit Status</p>
            <p className="text-xl font-extrabold font-mono text-indigo-600 mt-1">
              {overClaimedCount} Flagged
            </p>
            <p className="text-[10px] text-indigo-700/80 mt-0.5">Out of {items.length} BOQ Line Items</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search BOQ item, drawing ref..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700"
            >
              <option value="All">All Verification Statuses</option>
              <option value="Accepted">Accepted (100% Match)</option>
              <option value="Over Claimed">Over Claimed (Discrepancy)</option>
              <option value="Under Claimed">Under Claimed</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        <button
          onClick={handleAddItem}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 text-indigo-400" />
          <span>Add BOQ / Variation Line</span>
        </button>
      </div>

      {/* Interactive Master Verification Grid (27 Excel Columns) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse min-w-[2400px]">
            <thead className="sticky top-0 bg-slate-900 text-slate-300 font-semibold border-b border-slate-800 z-10 select-none">
              <tr>
                <th className="p-3 text-center border-r border-slate-800 w-12">Sl</th>
                <th className="p-3 border-r border-slate-800">RA Bill</th>
                <th className="p-3 border-r border-slate-800">Date</th>
                <th className="p-3 border-r border-slate-800">BOQ Item</th>
                <th className="p-3 border-r border-slate-800 min-w-[220px]">Description</th>
                <th className="p-3 border-r border-slate-800 text-center">Unit</th>
                <th className="p-3 border-r border-slate-800">GFC Drawing Ref</th>
                <th className="p-3 border-r border-slate-800 text-right">BOQ Qty</th>
                <th className="p-3 border-r border-slate-800 text-right">Prev Cert Qty</th>
                <th className="p-3 border-r border-slate-800 text-right bg-slate-800 text-indigo-300">Balance Qty</th>
                <th className="p-3 border-r border-slate-800 text-right bg-amber-950/80 text-amber-200">Contractor Claimed</th>
                <th className="p-3 border-r border-slate-800 text-right bg-emerald-950/80 text-emerald-200">TPI Verified Qty</th>
                <th className="p-3 border-r border-slate-800 text-right bg-slate-800 text-rose-300">Diff Qty</th>
                <th className="p-3 border-r border-slate-800 text-right">Unit Rate (₹)</th>
                <th className="p-3 border-r border-slate-800 text-right bg-amber-950/80 text-amber-200">Claimed Amount (₹)</th>
                <th className="p-3 border-r border-slate-800 text-right bg-emerald-950/80 text-emerald-200">Recommended Amount (₹)</th>
                <th className="p-3 border-r border-slate-800 text-center">Variation</th>
                <th className="p-3 border-r border-slate-800">Variation Ref</th>
                <th className="p-3 border-r border-slate-800">Contract Clause</th>
                <th className="p-3 border-r border-slate-800 text-center">Hidden Work</th>
                <th className="p-3 border-r border-slate-800">Measurement Type</th>
                <th className="p-3 border-r border-slate-800 min-w-[200px]">TPI Engineer Observation</th>
                <th className="p-3 border-r border-slate-800 text-center">Status</th>
                <th className="p-3 border-r border-slate-800">Action Required</th>
                <th className="p-3 border-r border-slate-800">Target Date</th>
                <th className="p-3 border-r border-slate-800 text-center">Closure</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredItems.map((item) => {
                const isOver = item.status === "Over Claimed";
                const isUnder = item.status === "Under Claimed";

                return (
                  <tr
                    key={item.slNo}
                    className={`hover:bg-indigo-50/40 transition-colors ${
                      isOver ? "bg-rose-50/30" : isUnder ? "bg-amber-50/30" : ""
                    }`}
                  >
                    <td className="p-3 text-center font-mono font-bold text-slate-500 border-r border-slate-100">
                      {item.slNo}
                    </td>
                    <td className="p-3 font-mono border-r border-slate-100">{item.raBill}</td>
                    <td className="p-3 border-r border-slate-100">{item.date}</td>
                    <td className="p-3 font-mono font-bold text-indigo-600 border-r border-slate-100">
                      {item.boqItem}
                    </td>
                    <td className="p-3 font-medium border-r border-slate-100">{item.description}</td>
                    <td className="p-3 text-center border-r border-slate-100 font-mono text-slate-600">
                      {item.unit}
                    </td>
                    <td className="p-3 font-mono text-slate-600 border-r border-slate-100">
                      {item.gfcDrawingRef}
                    </td>
                    <td className="p-3 text-right font-mono border-r border-slate-100">{item.boqQty}</td>
                    <td className="p-3 text-right font-mono border-r border-slate-100">
                      {item.prevCertifiedQty}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/50 border-r border-slate-100">
                      {item.balanceQty}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-amber-800 bg-amber-50/40 border-r border-slate-100">
                      {item.contractorClaimedQty}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40 border-r border-slate-100">
                      {item.tpiVerifiedQty}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-bold border-r border-slate-100 ${
                        isOver
                          ? "text-rose-600 bg-rose-100/50"
                          : isUnder
                          ? "text-amber-600 bg-amber-100/50"
                          : "text-slate-500"
                      }`}
                    >
                      {item.diffQty}
                    </td>
                    <td className="p-3 text-right font-mono border-r border-slate-100">
                      ₹{item.unitRate}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-900 border-r border-slate-100">
                      ₹{item.claimedAmt.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50 border-r border-slate-100">
                      ₹{item.recommendedAmt.toLocaleString()}
                    </td>
                    <td className="p-3 text-center border-r border-slate-100">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.isVariation === "Y"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.isVariation}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-600 border-r border-slate-100">
                      {item.variationRef}
                    </td>
                    <td className="p-3 text-slate-600 border-r border-slate-100">
                      {item.contractClause}
                    </td>
                    <td className="p-3 text-center border-r border-slate-100">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.isHiddenWork === "Y"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.isHiddenWork}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 border-r border-slate-100 font-medium">
                      {item.measurementType}
                    </td>
                    <td className="p-3 text-slate-600 border-r border-slate-100 text-[11px] leading-tight">
                      {item.observation}
                    </td>
                    <td className="p-3 text-center border-r border-slate-100">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isOver
                            ? "bg-rose-100 text-rose-700"
                            : isUnder
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 border-r border-slate-100 text-[11px]">
                      {item.actionRequired}
                    </td>
                    <td className="p-3 font-mono text-slate-500 border-r border-slate-100">
                      {item.targetDate}
                    </td>
                    <td className="p-3 text-center border-r border-slate-100">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.closureStatus === "Closed"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.closureStatus === "Pending Verification"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {item.closureStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-all flex items-center gap-1 mx-auto"
                      >
                        <Edit3 className="w-3 h-3 text-indigo-600" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Line Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 font-heading">
                Edit Item #{editingItem.slNo} ({editingItem.boqItem})
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={editingItem.description}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, description: e.target.value })
                  }
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Contractor Claimed Qty
                </label>
                <input
                  type="number"
                  value={editingItem.contractorClaimedQty}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      contractorClaimedQty: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-amber-300 rounded-xl text-xs font-mono font-bold bg-amber-50/50"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  TPI Verified Qty
                </label>
                <input
                  type="number"
                  value={editingItem.tpiVerifiedQty}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      tpiVerifiedQty: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-emerald-300 rounded-xl text-xs font-mono font-bold bg-emerald-50/50"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Unit Rate (₹)</label>
                <input
                  type="number"
                  value={editingItem.unitRate}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      unitRate: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Measurement Type</label>
                <input
                  type="text"
                  value={editingItem.measurementType}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, measurementType: e.target.value })
                  }
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">
                  TPI Engineer Observation & Recommendation
                </label>
                <textarea
                  rows={3}
                  value={editingItem.observation}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, observation: e.target.value })
                  }
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateItem(editingItem)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md glow-indigo"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TPI Scope Deliverables Reports Modal */}
      {showDeliverablesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-lg font-heading">
                    TPI Engineer Scope Deliverables Generator
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official Verification Reports per Independent Third Party Scope (Engineer: Rao)
                </p>
              </div>
              <button
                onClick={() => setShowDeliverablesModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Deliverables Tab Selection */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2 text-xs font-semibold overflow-x-auto">
              {[
                "Payment Recommendation Note",
                "Bill Verification Report",
                "Jointly Countersigned Measurement Sheets",
                "Quantity Reconciliation Report",
                "Variation Verification Report",
                "Register of Quantity Deviations",
                "Pending Measurement & Variation Register",
              ].map((deliv) => (
                <button
                  key={deliv}
                  onClick={() => setSelectedDeliverable(deliv)}
                  className={`px-3 py-2 rounded-xl border transition-all shrink-0 ${
                    selectedDeliverable === deliv
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {deliv}
                </button>
              ))}
            </div>

            {/* Document Preview Box */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-800 leading-relaxed font-sans bg-slate-50/50">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                      Third Party Inspection (TPI) Official Deliverable
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-900 font-heading mt-0.5">
                      {selectedDeliverable}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-600 block">
                      Ref: TPI-DELIV-2026-001
                    </span>
                    <span className="text-[11px] text-slate-400">Date: August 02, 2026</span>
                  </div>
                </div>

                {/* Report Specific Renderings */}
                {selectedDeliverable === "Payment Recommendation Note" && (
                  <div className="space-y-3">
                    <p>
                      <strong>To:</strong> Authorized Client Representative (Global Petrochem & Infrastructure Ltd.)
                      <br />
                      <strong>From:</strong> Bill Verification Engineer (Independent TPI Representative)
                    </p>
                    <p>
                      We have completed independent physical verification, joint measurement sheet review, and BOQ rate validation for Contractor Running Account Bill <strong>RA-001</strong> submitted by Apex Heavy Engineering Corp.
                    </p>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex justify-between font-medium">
                        <span>Total Claimed Amount by Contractor:</span>
                        <span className="font-mono font-bold">₹{totalClaimedAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium text-emerald-700">
                        <span>Verified & Recommended Payable Amount:</span>
                        <span className="font-mono font-bold">₹{totalRecommendedAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium text-rose-600 border-t border-slate-200 pt-2">
                        <span>Net Discrepancy Savings (Over-Claims Withheld):</span>
                        <span className="font-mono font-bold">₹{totalSavingsVariance.toLocaleString()}</span>
                      </div>
                    </div>

                    <p className="text-slate-600">
                      <strong>Recommendation:</strong> We recommend releasing payment of <strong>₹{totalRecommendedAmount.toLocaleString()}</strong> subject to retention and statutory tax deductions per Clause 14 of the Contract Agreement.
                    </p>
                  </div>
                )}

                {selectedDeliverable === "Bill Verification Report" && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900">1. Verification Summary</h4>
                    <p>
                      A total of {items.length} BOQ items were audited against GFC drawings and site execution. Out of {items.length} items, {items.length - overClaimedCount} items are fully accepted, and {overClaimedCount} items were flagged for over-claim variances.
                    </p>
                    <h4 className="font-bold text-slate-900">2. Discrepancy Observations</h4>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      <li>Item 6.12 (CS Pipes 6-inch): Billed 150m vs actual verified 120m. 30m over-claim withheld (₹43,500).</li>
                      <li>Item 10.05 (Epoxy Coating): 20 Ltrs withheld pending Zone B re-coating to achieve required DFT thickness.</li>
                    </ul>
                  </div>
                )}

                {selectedDeliverable === "Jointly Countersigned Measurement Sheets" && (
                  <div className="space-y-3">
                    <p>
                      <strong>Statement of Measurements:</strong> Joint site measurements were conducted with Contractor Site Engineers. Concealed/hidden works (SWTN Socket Weld Nipple) were offered and inspected prior to covering.
                    </p>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Status: All Measurement Sheets verified and jointly countersigned by TPI Engineer Rao.</span>
                    </div>
                  </div>
                )}

                {(selectedDeliverable === "Quantity Reconciliation Report" ||
                  selectedDeliverable === "Variation Verification Report" ||
                  selectedDeliverable === "Register of Quantity Deviations" ||
                  selectedDeliverable === "Pending Measurement & Variation Register") && (
                  <div className="space-y-3">
                    <p>
                      Detailed log of BOQ planned vs actual executed quantities, variation approvals (VAR-001, VAR-003), and pending field measurements.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                        <thead className="bg-slate-100 font-semibold text-slate-700">
                          <tr>
                            <th className="p-2 border border-slate-200">BOQ Item</th>
                            <th className="p-2 border border-slate-200">Description</th>
                            <th className="p-2 border border-slate-200">Variation Ref</th>
                            <th className="p-2 border border-slate-200">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((i) => (
                            <tr key={i.slNo}>
                              <td className="p-2 border border-slate-200 font-mono">{i.boqItem}</td>
                              <td className="p-2 border border-slate-200">{i.description}</td>
                              <td className="p-2 border border-slate-200 font-mono">{i.variationRef}</td>
                              <td className="p-2 border border-slate-200">{i.closureStatus}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Digital Signature Block */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Verified & Countersigned By</p>
                    <p className="font-bold text-slate-900 mt-1">Rao (Bill Verification Engineer)</p>
                    <p className="text-[11px] text-slate-500">Independent TPI Representative</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Client Authorization</p>
                    <p className="font-bold text-slate-900 mt-1">Global Petrochem Approval</p>
                    <p className="text-[11px] text-slate-500">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                ISO/IEC 17020 Third-Party Inspection Standard Format
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setShowDeliverablesModal(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md glow-indigo transition-all flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Deliverable</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
