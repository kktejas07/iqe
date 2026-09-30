"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Download,
  BookOpen,
  FileText,
  Sliders,
  ChevronRight,
  Sparkles,
  Eye,
  FileSpreadsheet,
} from "@/components/icons";

interface ITPActivity {
  slNo: number;
  activity: string;
  referenceSpec: string;
  checkMethod: string;
  acceptanceCriteria: string;
  subcon: "H" | "W" | "R" | "S";
  contractor: "H" | "W" | "R" | "S";
  tpiIQE: "H" | "W" | "R" | "S";
  client: "H" | "W" | "R" | "S";
  status: "Completed" | "Pending Witness" | "Hold Point Active";
}

interface ITPPlan {
  id: string;
  code: string;
  title: string;
  project: string;
  rev: string;
  client: string;
  activitiesCount: number;
  holdPointsCount: number;
  witnessPointsCount: number;
  activities: ITPActivity[];
}

const ITPS: ITPPlan[] = [
  {
    id: "itp-01",
    code: "ITP-PH-EPC-001",
    title: "Pharma Cleanroom Facility & HVAC Validation Plan",
    project: "Schedule M Revised 2024 Compliance Upgrade",
    rev: "Rev 1.0",
    client: "Biogenix Lifesciences Pvt Ltd",
    activitiesCount: 18,
    holdPointsCount: 4,
    witnessPointsCount: 8,
    activities: [
      {
        slNo: 1,
        activity: "Raw Material & Modular Cleanroom Wall/Ceiling Panel Test",
        referenceSpec: "ISO 14644-4 / Schedule M",
        checkMethod: "PIR Core Density, Fire Rating & Certificate Review",
        acceptanceCriteria: "Factory Test Cert + Class 1 Fire Retardant",
        subcon: "H",
        contractor: "W",
        tpiIQE: "W",
        client: "R",
        status: "Completed"
      },
      {
        slNo: 2,
        activity: "Concealed Work: Floor Epoxy Vapour Barrier & Rebar Coving",
        referenceSpec: "DIN 18560 / IS 456",
        checkMethod: "Moisture Content Meter (<4%) & Primer Pull-off Test",
        acceptanceCriteria: "Pull-off > 1.5 MPa. Zero bubbles or un-bonded patches.",
        subcon: "H",
        contractor: "H",
        tpiIQE: "H",
        client: "W",
        status: "Completed"
      },
      {
        slNo: 3,
        activity: "HEPA Filter Terminal Box PAO Integrity Leak Testing",
        referenceSpec: "ISO 14644-3 / Schedule M F-05",
        checkMethod: "Aerosol Photometer Upstream PAO Challenge",
        acceptanceCriteria: "Downstream penetration < 0.01% (Zero bypass leak)",
        subcon: "H",
        contractor: "W",
        tpiIQE: "H",
        client: "W",
        status: "Hold Point Active"
      },
      {
        slNo: 4,
        activity: "Air Velocity, ACPH & Cleanroom Room Pressure Differential",
        referenceSpec: "Schedule M Annexure A / ISO 14644",
        checkMethod: "Digital Anemometer + Magnehelic Gauge Calibration",
        acceptanceCriteria: "Positive cascade: 15 Pa / 10 Pa between adjacent grades.",
        subcon: "W",
        contractor: "W",
        tpiIQE: "W",
        client: "H",
        status: "Pending Witness"
      }
    ]
  },
  {
    id: "itp-02",
    code: "ITP-MCR-PIPING",
    title: "Process Piping & High-Purity Water Systems",
    project: "WFI & Pure Steam Distribution Loop",
    rev: "Rev 2.0",
    client: "Cipla Biotech SEZ",
    activitiesCount: 14,
    holdPointsCount: 3,
    witnessPointsCount: 6,
    activities: [
      {
        slNo: 1,
        activity: "Orbital Weld Video-Borescope Inspection (100% of welds)",
        referenceSpec: "ASME BPE Section MJ / AWS D18.1",
        checkMethod: "Flexible 4mm Digital Video Endoscope",
        acceptanceCriteria: "Full penetration, zero discoloration beyond Level 3.",
        subcon: "H",
        contractor: "W",
        tpiIQE: "H",
        client: "W",
        status: "Completed"
      },
      {
        slNo: 2,
        activity: "Hydrostatic Pressure Test (1.5x Design Pressure)",
        referenceSpec: "ASME B31.3 Chapter VI",
        checkMethod: "Calibrated Pressure Gauges & Chart Recorder",
        acceptanceCriteria: "Zero pressure drop over 2 hours hold time.",
        subcon: "H",
        contractor: "H",
        tpiIQE: "H",
        client: "W",
        status: "Completed"
      }
    ]
  },
  {
    id: "itp-03",
    code: "ITP-IOCL-REACT",
    title: "Heavy Reactor Fabrication & Pressure Vessel Inspection",
    project: "Refinery Expansion Package",
    rev: "Rev 3.0",
    client: "Indian Oil Corporation Ltd (IOCL)",
    activitiesCount: 22,
    holdPointsCount: 6,
    witnessPointsCount: 10,
    activities: [
      {
        slNo: 1,
        activity: "Plate Ultrasonic Testing (UT) for Laminations",
        referenceSpec: "ASTM A578 Level II",
        checkMethod: "Digital Flaw Detector with Dual Crystal Probe",
        acceptanceCriteria: "Zero continuous defect indication > 25mm diameter.",
        subcon: "H",
        contractor: "W",
        tpiIQE: "W",
        client: "R",
        status: "Completed"
      },
      {
        slNo: 2,
        activity: "Radiographic Examination (100% RT on Category A & B Welds)",
        referenceSpec: "ASME Sec VIII Div 1 UW-51",
        checkMethod: "Ir-192 Gamma Radiography / Film Density 2.0-4.0",
        acceptanceCriteria: "Zero cracks, lack of penetration, or burn-through.",
        subcon: "H",
        contractor: "W",
        tpiIQE: "H",
        client: "W",
        status: "Hold Point Active"
      }
    ]
  }
];

export default function ITPsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedITP, setSelectedITP] = useState<ITPPlan>(ITPS[0]);

  const filteredITPs = ITPS.filter(
    (i) =>
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBadge = (type: "H" | "W" | "R" | "S") => {
    switch (type) {
      case "H":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">H (Hold)</span>;
      case "W":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">W (Witness)</span>;
      case "R":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300">R (Review)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">S (Surv)</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* TOP HEADER CONTAINER (Identical to Bill Verification Format Shell) */}
      <div className="bg-white text-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#003366] dark:text-sky-300 font-heading tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#0084bf]" />
              <span>Inspection &amp; Test Plans (ITP)</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-bold font-mono">
              Quality Assurance Matrix
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/pms-formats"
              className="px-3.5 py-1.5 rounded-xl bg-[#0084bf] hover:bg-[#0073a8] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>PMS Formats Hub</span>
            </Link>
          </div>
        </div>

        {/* Sub-module Navigation Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
          <Link
            href="/pms-formats"
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 hover:bg-slate-100 transition-all text-xs"
          >
            <BookOpen className="w-4 h-4 text-sky-600" />
            <div>
              <div className="font-extrabold text-slate-800">Formats</div>
              <div className="text-[11px] text-slate-400">Audit &amp; Formats</div>
            </div>
          </Link>
          <Link
            href="/sops"
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 hover:bg-slate-100 transition-all text-xs"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="font-extrabold text-slate-800">SOP&apos;s</div>
              <div className="text-[11px] text-slate-400">Operating Procedures</div>
            </div>
          </Link>
          <Link
            href="/work-instructions"
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 hover:bg-slate-100 transition-all text-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
            <div>
              <div className="font-extrabold text-slate-800">Work Instructions</div>
              <div className="text-[11px] text-slate-400">Technical Protocols</div>
            </div>
          </Link>
          <Link
            href="/itps"
            className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-2.5 text-xs font-bold text-purple-900"
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <div>
              <div className="font-extrabold text-purple-900">ITP&apos;s</div>
              <div className="text-[11px] text-purple-700">Active Quality Plans</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Select ITP Register */}
        <div className="lg:col-span-1 space-y-3">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2">
              Select Quality Plan (ITP)
            </h3>
            <div className="space-y-2">
              {filteredITPs.map((plan) => {
                const isSelected = selectedITP.id === plan.id;
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedITP(plan)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      isSelected
                        ? "bg-gradient-to-r from-[#0084bf]/15 to-[#00618e]/15 border-[#0084bf] shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#0084bf]">
                      <span>{plan.code}</span>
                      <span className="text-slate-500">{plan.rev}</span>
                    </div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white mt-1 leading-snug">
                      {plan.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {plan.project}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ITP Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="text-slate-400 uppercase text-[11px] font-bold">Legend Matrix</div>
            <div className="flex items-center justify-between">
              <span><strong>H</strong>: Hold Point</span>
              <span className="text-slate-400">Formal sign-off required</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>W</strong>: Witness Point</span>
              <span className="text-slate-400">Physical testing witness</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>R</strong>: Review Point</span>
              <span className="text-slate-400">MTC / Test cert review</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>S</strong>: Surveillance</span>
              <span className="text-slate-400">Random site check</span>
            </div>
          </div>
        </div>

        {/* Right Side: ITP Matrix Table */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-[#0084bf]">{selectedITP.code} &bull; {selectedITP.rev}</span>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white font-heading mt-0.5">
                  {selectedITP.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Client: <strong className="text-slate-700 dark:text-slate-200">{selectedITP.client}</strong> &bull; Project: {selectedITP.project}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 text-[11px] font-bold font-mono">
                  {selectedITP.holdPointsCount} Hold Points
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 text-[11px] font-bold font-mono">
                  {selectedITP.witnessPointsCount} Witness Points
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Activity &amp; Component</th>
                    <th className="p-3">Reference Spec</th>
                    <th className="p-3">Verification Method</th>
                    <th className="p-3 text-center">Subcon</th>
                    <th className="p-3 text-center">Contractor</th>
                    <th className="p-3 text-center text-[#0084bf] font-bold">IQE TPI</th>
                    <th className="p-3 text-center">Client</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedITP.activities.map((act) => (
                    <tr key={act.slNo} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-center text-slate-400">{act.slNo}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-xs leading-snug">
                        {act.activity}
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">{act.acceptanceCriteria}</div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">{act.referenceSpec}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{act.checkMethod}</td>
                      <td className="p-3 text-center">{getBadge(act.subcon)}</td>
                      <td className="p-3 text-center">{getBadge(act.contractor)}</td>
                      <td className="p-3 text-center font-bold">{getBadge(act.tpiIQE)}</td>
                      <td className="p-3 text-center">{getBadge(act.client)}</td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                          act.status === "Completed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : act.status === "Hold Point Active"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {act.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
