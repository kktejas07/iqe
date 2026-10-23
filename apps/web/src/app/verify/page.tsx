"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IQELogo } from "@/components/IQELogo";
import {
  ArrowUpRight, Building, Calendar, FileText, Hash, ShieldCheck,
  Tag, Info, AlertTriangle, X,
} from "@/components/icons";
import { API_BASE } from "@/lib/config";

/**
 * Scan-to-verify. Opened on a phone from the QR code printed on an IQE
 * document.
 *
 * This page used to read seven fields out of the URL query string and render
 * them under IQE branding with a green "Scanned from an IQE report" badge,
 * querying nothing. Anyone could type
 *
 *   /verify?t=Inspection+Release+Note&ref=IRN-2026-9999&status=Issued
 *
 * and get a page indistinguishable from a genuine scan. It verified nothing;
 * it displayed whatever it was handed.
 *
 * Now the reference is the only thing taken from the URL, and everything
 * shown comes from the server's answer. A reference that is not in the
 * database says so plainly, in red, rather than rendering as a document.
 */

type Verification = {
  found: boolean;
  reference: string;
  in_force: boolean;
  status: string | null;
  meaning: string;
  document_type: string | null;
  title: string | null;
  issued_on: string | null;
  client: string | null;
  issuing_body: string;
  checked_at: string;
};

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return value;
  }
}

function VerifyContent() {
  const params = useSearchParams();
  // The reference is all that is taken from the URL, and it is only a
  // lookup key - nothing it says is displayed as fact.
  const reference = params.get("ref") || "";
  const pdf = params.get("pdf");

  const [result, setResult] = useState<Verification | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!reference) {
      setResult(null);
      return;
    }
    let live = true;
    fetch(`${API_BASE}/api/v1/verify/${encodeURIComponent(reference)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => live && setResult(data))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [reference]);

  const loading = reference !== "" && result === null && !failed;

  return (
    <div className="min-h-screen bg-[#f4f8fb] text-slate-900 flex flex-col">
      <div className="gradient-iqe-dark px-5 pt-8 pb-16 text-white relative overflow-hidden">
        <div aria-hidden className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-[#0084bf]/30 blur-3xl animate-blob" />
        <div className="relative max-w-md mx-auto flex items-center gap-3 animate-fade-down">
          <IQELogo className="w-11 h-11" />
          <div>
            <p className="font-heading font-bold leading-tight">
              Ideal Quality Engineers (I) Pvt Ltd
            </p>
            <p className="text-[11px] text-sky-200/80">
              Third Party Inspection &amp; Engineering Services
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 -mt-10 pb-10">
        <div className="max-w-md mx-auto space-y-4">
          {!reference ? (
            <Panel>
              <Verdict tone="unknown" label="Nothing to check" />
              <p className="mt-3 text-sm text-slate-600">
                This link carries no document reference. Scan the QR code printed on
                the document, or enter its reference number.
              </p>
            </Panel>
          ) : loading ? (
            <Panel>
              <div className="h-5 w-40 rounded bg-slate-100 animate-pulse" />
              <div className="mt-3 h-4 w-full rounded bg-slate-100 animate-pulse" />
              <div className="mt-2 h-4 w-2/3 rounded bg-slate-100 animate-pulse" />
            </Panel>
          ) : failed ? (
            <Panel>
              <Verdict tone="unknown" label="Could not be checked" />
              <p className="mt-3 text-sm text-slate-600">
                We could not reach IQE&rsquo;s records just now, so this document is
                unverified. Try again shortly rather than relying on it.
              </p>
              <Reference value={reference} />
            </Panel>
          ) : result ? (
            <>
              <Panel>
                <Verdict
                  tone={!result.found ? "bad" : result.in_force ? "ok" : "warn"}
                  label={
                    !result.found
                      ? "Not found in IQE records"
                      : result.in_force
                      ? "Valid IQE document"
                      : "Not in force"
                  }
                />
                <h1 className="mt-3 font-heading text-xl font-bold leading-snug text-slate-900">
                  {result.title ?? result.reference}
                </h1>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    !result.found || !result.in_force
                      ? "text-rose-800 font-medium"
                      : "text-slate-600"
                  }`}
                >
                  {result.meaning}
                </p>

                {result.found && (
                  <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                    <Row icon={Hash} label="Reference" value={result.reference} />
                    <Row icon={FileText} label="Document" value={result.document_type} />
                    <Row icon={Tag} label="Status" value={result.status} />
                    <Row icon={Calendar} label="Issued" value={formatDate(result.issued_on)} />
                    <Row icon={Building} label="Client" value={result.client} />
                  </dl>
                )}

                {!result.found && <Reference value={reference} />}
              </Panel>

              {/* Offered only for a document that is actually in force. A
                  withdrawn certificate should not be handed back as a PDF to
                  show someone. */}
              {pdf && result.found && result.in_force ? (
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
              ) : null}

              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 px-1">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Checked against IQE&rsquo;s records on{" "}
                {formatDate(result.checked_at) ?? "today"}. Compare these details with
                the printed document; if anything differs, contact{" "}
                {result.issuing_body} before relying on it.
              </p>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-lift border border-slate-200/80 p-5 animate-scale-up">
      {children}
    </section>
  );
}

/** The verdict carries an icon as well as a colour, so it still reads on a
 *  phone in sunlight and for anyone who cannot separate red from green. */
function Verdict({ tone, label }: { tone: "ok" | "warn" | "bad" | "unknown"; label: string }) {
  const styles = {
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    bad: "bg-rose-50 text-rose-700 border-rose-200",
    unknown: "bg-slate-100 text-slate-600 border-slate-200",
  }[tone];
  const Icon = tone === "ok" ? ShieldCheck : tone === "bad" ? X : AlertTriangle;
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${styles}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="w-4 h-4 mt-0.5 text-[#0084bf] shrink-0" />
      <dt className="text-xs text-slate-500 w-24 shrink-0 pt-px">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800 break-words min-w-0">{value}</dd>
    </div>
  );
}

function Reference({ value }: { value: string }) {
  return (
    <p className="mt-3 text-xs text-slate-500">
      Reference checked:{" "}
      <span className="font-mono text-slate-700 break-all">{value}</span>
    </p>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f8fb]" />}>
      <VerifyContent />
    </Suspense>
  );
}
