"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileText, Search, RefreshCw, X, ChevronRight, Printer, Signature,
  Paperclip, Layers, Users, Receipt, Sparkles, AlertTriangle,
} from "@/components/icons";
import { api } from "@/lib/api";
import { toast } from "@/components/feedback";
import { formatCurrency, formatDate } from "@/lib/workPackageLifecycle";

type ReportFormat = {
  format_code: string;
  name: string;
  kind: "VISIT" | "CERTIFICATE" | "MEASUREMENT" | "REGISTER" | "COMPOSED";
  description?: string | null;
  work_type_codes: string[];
  template_path?: string | null;
  sections: string[];
  requires_signatures: string[];
  annexures: string[];
  is_client_specific: boolean;
  revision: string;
  is_active: boolean;
};

const KIND_TONE: Record<string, string> = {
  VISIT:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:ring-sky-800/60",
  CERTIFICATE:
    "bg-iqeOrange-50 text-iqeOrange-800 ring-iqeOrange-300 dark:bg-iqeOrange-950/60 dark:text-iqeOrange-200 dark:ring-iqeOrange-800/60",
  MEASUREMENT:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-200 dark:ring-violet-800/60",
  REGISTER:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-800/60",
  COMPOSED:
    "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-200 dark:ring-indigo-800/60",
};

const KIND_LABEL: Record<string, string> = {
  VISIT: "Visit",
  CERTIFICATE: "Certificate",
  MEASUREMENT: "Measurement",
  REGISTER: "Register",
  COMPOSED: "Composed",
};

const KIND_MEANING: Record<string, string> = {
  VISIT: "One inspection event, reported as it happened.",
  CERTIFICATE: "An assurance IQE signs — needs a second signatory.",
  MEASUREMENT: "Quantities, and the evidence behind them.",
  REGISTER: "A running list kept across a job.",
  COMPOSED: "Built from records already captured, not filled in by hand.",
};

export default function ReportsPage() {
  const [formats, setFormats] = useState<ReportFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [jobId, setJobId] = useState("");
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getReportFormats(
        kindFilter ? { kind: kindFilter } : undefined,
      );
      setFormats(res?.data ?? []);
    } catch {
      toast.error("Could not load report formats. Check the API connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [kindFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const seed = async () => {
    try {
      const res = await api.seedReportFormats();
      const created = res?.created?.length ?? 0;
      toast.success(
        created
          ? `Loaded ${created} format${created === 1 ? "" : "s"} into the registry.`
          : "Registry already holds every standard format.",
      );
      load();
    } catch {
      toast.error("Could not load the standard formats.");
    }
  };

  const runProjectReport = async () => {
    const id = jobId.trim();
    if (!id) return;
    setReportLoading(true);
    setReport(null);
    try {
      setReport(await api.getProjectReport(id));
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      toast.error(detail || `Could not compose a report for ${id}.`);
    } finally {
      setReportLoading(false);
    }
  };

  const visible = formats.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.format_code.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q) ||
      (f.description ?? "").toLowerCase().includes(q) ||
      f.work_type_codes.some((c) => c.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-[#0084bf] to-[#00618e] text-white shadow-glow-blue">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
              Reports
            </h1>
            <p className="mt-0.5 max-w-xl text-sm text-slate-500 dark:text-slate-400">
              Which deliverable each kind of work produces, and the end-to-end project
              position composed from what has actually been certified.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={seed}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Sparkles className="h-4 w-4" />
            Load standard formats
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* ------------------------------------------- composed project report */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-base font-semibold text-slate-900 dark:text-white">
              End-to-end project report
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Composed live from work packages, certifications, deployment and billing —
              nothing is typed in twice.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runProjectReport()}
              placeholder="JOB-2026-0001"
              className={inputClass + " sm:w-48"}
            />
            <button
              onClick={runProjectReport}
              disabled={!jobId.trim() || reportLoading}
              className="shrink-0 rounded-xl bg-[#0084bf] px-4 py-2.5 text-sm font-semibold text-white shadow-glow-blue hover:bg-[#00739f] disabled:opacity-50"
            >
              {reportLoading ? "Composing…" : "Compose"}
            </button>
          </div>
        </div>

        {report && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                  {report.project_header?.title}
                </div>
                <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {report.project_header?.client_name}
                  {report.project_header?.location ? ` · ${report.project_header.location}` : ""}
                  {" · "}
                  <span className="font-mono text-xs">{report.project_header?.job_id}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  Composed {formatDate(report.generated_at)}
                </span>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
              </div>
            </div>

            {/* the claimed → certified subtraction, same shape as the certifications page */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
              <Figure
                label="Claimed"
                value={formatCurrency(report.certified_position?.claimed_value ?? 0)}
                sub={`${report.certified_position?.certifications_issued ?? 0} issued`}
              />
              <Operator symbol="−" />
              <Figure
                label="Deducted"
                value={formatCurrency(report.certified_position?.deduction_value ?? 0)}
                sub={
                  report.certified_position?.deduction_pct
                    ? `${report.certified_position.deduction_pct}% of claim`
                    : undefined
                }
                tone="rose"
              />
              <Operator symbol="=" />
              <Figure
                label="Certified"
                value={formatCurrency(report.certified_position?.certified_value ?? 0)}
                emphasis
              />
              {(report.certified_position?.retention_held ?? 0) > 0 && (
                <>
                  <Operator symbol="−" />
                  <Figure
                    label="Retention held"
                    value={formatCurrency(report.certified_position.retention_held)}
                  />
                </>
              )}
            </div>

            {(report.billing_position?.certified_not_billed_value ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-iqeOrange-200 bg-iqeOrange-50/70 px-4 py-3 dark:border-iqeOrange-900/50 dark:bg-iqeOrange-950/30">
                <AlertTriangle className="h-5 w-5 shrink-0 text-[#e35f14]" />
                <p className="text-sm text-iqeOrange-900 dark:text-iqeOrange-200">
                  <strong className="font-semibold">
                    {formatCurrency(report.billing_position.certified_not_billed_value)}
                  </strong>{" "}
                  certified on this job and not yet invoiced.
                </p>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              <Panel icon={Layers} title="Work packages">
                <div className="font-heading text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {report.work_packages?.total ?? 0}
                </div>
                <dl className="mt-2 space-y-1">
                  {Object.entries(report.work_packages?.by_status ?? {}).map(([s, n]) => (
                    <div key={s} className="flex justify-between text-xs">
                      <dt className="capitalize text-slate-500 dark:text-slate-400">
                        {s.replace(/_/g, " ")}
                      </dt>
                      <dd className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                        {n as number}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Panel>

              <Panel icon={Users} title="People deployed">
                <div className="font-heading text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {report.people_deployed?.count ?? 0}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {report.people_deployed?.total_days ?? 0} planned man-days
                </p>
                <ul className="mt-2 space-y-1">
                  {(report.people_deployed?.detail ?? []).slice(0, 5).map((p: any) => (
                    <li key={p.person_id} className="flex justify-between gap-2 text-xs">
                      <span className="truncate text-slate-600 dark:text-slate-300">
                        {p.person_name || p.person_id}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-400">{p.days}d</span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel icon={Receipt} title="Billing position">
                <div className="font-heading text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(report.billing_position?.invoiced_value ?? 0)}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  across {report.billing_position?.invoices_raised ?? 0} invoice
                  {report.billing_position?.invoices_raised === 1 ? "" : "s"}
                </p>
                <dl className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <dt className="text-slate-500 dark:text-slate-400">Paid</dt>
                    <dd className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(report.billing_position?.paid_value ?? 0)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-xs">
                    <dt className="text-slate-500 dark:text-slate-400">Outstanding</dt>
                    <dd className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                      {formatCurrency(report.billing_position?.outstanding_value ?? 0)}
                    </dd>
                  </div>
                </dl>
              </Panel>
            </div>

            {Object.keys(report.deductions_by_reason ?? {}).length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800">
                <h3 className="font-heading text-sm font-semibold text-slate-900 dark:text-white">
                  Why value was deducted
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  The breakdown a contractor will ask for before accepting the certified figure.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {Object.entries(report.deductions_by_reason)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .map(([reason, value]) => (
                      <li key={reason} className="flex items-center justify-between gap-3 text-sm">
                        <span className="capitalize text-slate-600 dark:text-slate-300">
                          {reason.toLowerCase().replace(/_/g, " ")}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                          {formatCurrency(value as number)}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {Object.keys(report.work_packages?.by_discipline ?? {}).length > 0 && (
              <div className="space-y-3">
                {Object.entries(report.work_packages.by_discipline).map(([disc, packages]) => (
                  <div
                    key={disc}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-2 dark:bg-slate-800/50">
                      <span className="font-heading text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {disc}
                      </span>
                      <span className="text-xs text-slate-400">
                        {(packages as any[]).length} package
                        {(packages as any[]).length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(packages as any[]).map((p) => (
                          <tr key={p.work_package_id}>
                            <td className="px-4 py-2 font-mono text-xs text-slate-400">
                              {p.work_package_id}
                            </td>
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                              {p.title}
                            </td>
                            <td className="px-4 py-2 text-xs text-slate-400">
                              {p.work_type_code}
                            </td>
                            <td className="px-4 py-2 text-right text-xs capitalize text-slate-500 dark:text-slate-400">
                              {String(p.status).replace(/_/g, " ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ------------------------------------------------- format registry */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search formats by code, name or work type"
              className={inputClass + " pl-9 pr-9"}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className={inputClass + " sm:w-52"}
          >
            <option value="">All kinds</option>
            {Object.entries(KIND_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {kindFilter && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {KIND_MEANING[kindFilter]}
          </p>
        )}

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40"
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
            <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              {formats.length === 0
                ? "The registry is empty."
                : "No format matches that search."}
            </p>
            {formats.length === 0 && (
              <button
                onClick={seed}
                className="mt-3 rounded-xl bg-[#0084bf] px-4 py-2 text-sm font-semibold text-white shadow-glow-blue hover:bg-[#00739f]"
              >
                Load the standard formats
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visible.map((f) => {
              const open = expanded === f.format_code;
              return (
                <article
                  key={f.format_code}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-sm font-semibold text-slate-900 dark:text-white">
                          {f.name}
                        </h3>
                        <span className="font-mono text-xs text-slate-400">{f.format_code}</span>
                      </div>
                      {f.description && (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {f.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                        KIND_TONE[f.kind] ?? KIND_TONE.VISIT
                      }`}
                    >
                      {KIND_LABEL[f.kind] ?? f.kind}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {f.work_type_codes.length === 0 ? (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        every work type
                      </span>
                    ) : (
                      f.work_type_codes.map((c) => (
                        <span
                          key={c}
                          className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {c}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Signature className="h-3.5 w-3.5" />
                      {f.requires_signatures.length} signatory
                      {f.requires_signatures.length === 1 ? "" : "ies"}
                    </span>
                    {f.annexures.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        {f.annexures.length} annexure
                        {f.annexures.length === 1 ? "" : "s"}
                      </span>
                    )}
                    <span>{f.revision}</span>
                    <button
                      onClick={() => setExpanded(open ? null : f.format_code)}
                      className="ml-auto inline-flex items-center gap-0.5 font-medium text-[#0084bf] hover:underline"
                    >
                      {open ? "Hide" : "Structure"}
                      <ChevronRight
                        className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`}
                      />
                    </button>
                  </div>

                  {open && (
                    <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                      <Row label="Sections" values={f.sections.map((s) => s.replace(/_/g, " "))} />
                      <Row label="Signed by" values={f.requires_signatures.map((s) => s.replace(/_/g, " "))} />
                      {f.annexures.length > 0 && <Row label="Annexures" values={f.annexures} />}
                      {f.template_path && (
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 text-slate-400">Template</dt>
                          <dd className="font-mono text-slate-600 dark:text-slate-300">
                            {f.template_path}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-slate-400">{label}</dt>
      <dd className="flex flex-wrap gap-1">
        {values.map((v) => (
          <span
            key={v}
            className="rounded-md bg-slate-100 px-1.5 py-0.5 capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            {v}
          </span>
        ))}
      </dd>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Figure({
  label,
  value,
  sub,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
  tone?: "rose";
}) {
  return (
    <div className="min-w-[8.5rem]">
      <div className="text-xs text-slate-400">{label}</div>
      <div
        className={`font-heading text-xl font-bold tabular-nums ${
          tone === "rose"
            ? "text-rose-600 dark:text-rose-400"
            : emphasis
            ? "text-[#0084bf]"
            : "text-slate-800 dark:text-slate-200"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function Operator({ symbol }: { symbol: string }) {
  return (
    <span aria-hidden className="px-1 text-lg font-light text-slate-300 dark:text-slate-600">
      {symbol}
    </span>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0084bf] focus:outline-none focus:ring-2 focus:ring-[#0084bf]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
