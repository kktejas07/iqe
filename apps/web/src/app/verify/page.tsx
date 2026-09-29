"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IQELogo } from "@/components/IQELogo";
import { ArrowUpRight, Building, Calendar, FileText, Hash, ShieldCheck, Tag, Info } from "@/components/icons";

/**
 * Landing page for the QR code printed on IQE reports. Opened on a phone after
 * scanning, it shows the document's details and re-opens the same PDF.
 * Public (no login, no app header) and designed mobile-first.
 */
function VerifyContent() {
  const params = useSearchParams();
  const title = params.get("t") || "IQE Document";
  const pdf = params.get("pdf");
  const rows = [
    { icon: Hash, label: "Reference", value: params.get("ref") },
    { icon: FileText, label: "Form", value: params.get("form") },
    { icon: Building, label: "Client / Site", value: params.get("client") },
    { icon: Tag, label: "Status", value: params.get("status") },
    { icon: Calendar, label: "Issued", value: params.get("date") },
  ].filter((r) => r.value);

  return (
    <div className="min-h-screen bg-[#f4f8fb] text-slate-900 flex flex-col">
      {/* Brand band */}
      <div className="gradient-iqe-dark px-5 pt-8 pb-16 text-white relative overflow-hidden">
        <div aria-hidden className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-[#0084bf]/30 blur-3xl animate-blob" />
        <div className="relative max-w-md mx-auto flex items-center gap-3 animate-fade-down">
          <IQELogo className="w-11 h-11" />
          <div>
            <p className="font-heading font-bold leading-tight">Ideal Quality Engineers (I) Pvt Ltd</p>
            <p className="text-[11px] text-sky-200/80">ISO 9001:2015 · ISO/IEC 17020 Inspection Body</p>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 -mt-10 pb-10">
        <div className="max-w-md mx-auto space-y-4">
          <section className="bg-white rounded-2xl shadow-lift border border-slate-200/80 overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Scanned from an IQE report
              </div>
              <h1 className="font-heading text-xl font-bold leading-snug text-slate-900">{title}</h1>
            </div>

            {rows.length > 0 && (
              <dl className="divide-y divide-slate-100 stagger">
                {rows.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 px-5 py-3">
                    <Icon className="w-4 h-4 mt-0.5 text-[#0084bf] shrink-0" />
                    <dt className="text-xs text-slate-500 w-24 shrink-0 pt-px">{label}</dt>
                    <dd className="text-sm font-semibold text-slate-800 break-words min-w-0">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {pdf ? (
            <a
              href={pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="sheen group flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0084bf] via-[#0075ab] to-[#e35f14] text-white font-semibold shadow-glow-blue animate-fade-up [animation-delay:150ms]"
            >
              <FileText className="w-5 h-5" />
              Open the PDF on this device
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          ) : (
            <p className="text-xs text-slate-500 text-center">The PDF for this document isn&apos;t available online.</p>
          )}

          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 px-1 animate-fade-in [animation-delay:300ms]">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Compare these details with the printed document. If anything differs, contact Ideal Quality Engineers before relying on it.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f8fb]" />}>
      <VerifyContent />
    </Suspense>
  );
}
