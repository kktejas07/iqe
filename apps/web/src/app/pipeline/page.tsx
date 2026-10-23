"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCw, TrendingUp, AlertTriangle } from "@/components/icons";
import { api } from "@/lib/api";
import { toast } from "@/components/feedback";
import {
  Card, EmptyState, Metric, PageHeader, SkeletonRows, StatusPill, Tone,
  buttonSecondary, formatINR, humanise,
} from "@/components/ui";

/**
 * The pre-sales funnel, and why work does not arrive.
 *
 * The page is built around the distinction the whole module exists for:
 * work IQE declined at gate 1 and work the client placed elsewhere at gate 2
 * are different events with different remedies. They are never summed.
 */

/** Funnel order, so the stages read as a sequence rather than alphabetically. */
const STAGES: { status: string; label: string }[] = [
  { status: "draft", label: "Draft" },
  { status: "qualifying", label: "Qualifying" },
  { status: "pending_decision", label: "Awaiting bid decision" },
  { status: "go", label: "Bid approved" },
  { status: "estimating", label: "Estimating" },
  { status: "proposal_draft", label: "Proposal drafted" },
  { status: "submitted", label: "Submitted" },
  { status: "under_clarification", label: "In clarification" },
  { status: "won", label: "Won" },
  { status: "converted", label: "Converted to job" },
];

const SIDE_STAGES: { status: string; label: string; tone: Tone }[] = [
  { status: "no_go", label: "Declined (no-go)", tone: "warn" },
  { status: "remediation", label: "Under remediation", tone: "info" },
  { status: "closed_no_bid", label: "Closed — no bid", tone: "idle" },
  { status: "lost", label: "Lost", tone: "bad" },
  { status: "revived", label: "Revived", tone: "info" },
  { status: "closed_lost", label: "Closed — lost", tone: "idle" },
];

export default function PipelinePage() {
  const [summary, setSummary] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        api.getPipelineSummary(),
        api.getLossAnalysis().catch(() => null),
      ]);
      setSummary(s);
      setAnalysis(a);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        toast.error("Pipeline figures are limited to admin, coordination and finance.");
      } else {
        toast.error("Could not load the pipeline.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byStatus: Record<string, { count: number; value: number }> =
    summary?.by_status ?? {};
  const peak = Math.max(1, ...Object.values(byStatus).map((r: any) => r.count));

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BarChart3}
        title="Pipeline"
        description="Enquiries from first contact to work order, and the reasons work did not arrive."
        actions={
          <button onClick={load} className={buttonSecondary}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {loading ? (
        <SkeletonRows rows={4} />
      ) : !summary || summary.total === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No enquiries yet"
          description="The funnel fills as enquiries are recorded, scored at the bid gate, quoted and won or lost."
        />
      ) : (
        <>
          <Card className="p-4">
            <div className="flex flex-wrap gap-8">
              <Metric value={summary.live} label="Live enquiries" />
              <Metric value={formatINR(summary.pipeline_value)} label="Pipeline value" />
              <Metric
                value={formatINR(summary.weighted_value)}
                label="Weighted forecast"
                tone="info"
              />
              <Metric
                value={summary.win_rate_pct === null ? "—" : `${summary.win_rate_pct}%`}
                label="Win rate"
                tone={
                  summary.win_rate_pct === null
                    ? undefined
                    : summary.win_rate_pct >= 40
                    ? "ok"
                    : "warn"
                }
              />
              <Metric value={summary.bid_count} label="Bid on" />
              <Metric value={summary.no_bid_count} label="Declined to bid" tone="idle" />
            </div>
            {/* The raw total always flatters; the weighted figure is the one to
                plan against, and saying so beats hoping it is understood. */}
            <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {summary.note}
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="font-heading text-sm font-semibold text-slate-900 dark:text-white">
              Where enquiries are
            </h2>
            <div className="mt-3 space-y-1.5">
              {STAGES.filter((s) => byStatus[s.status]).map((s) => {
                const row = byStatus[s.status];
                return (
                  <div key={s.status} className="flex items-center gap-3">
                    <span className="w-44 shrink-0 text-sm text-slate-600 dark:text-slate-400">
                      {s.label}
                    </span>
                    <div className="h-5 flex-1 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-md bg-[#0084bf]/80"
                        style={{ width: `${(row.count / peak) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-slate-900 dark:text-white">
                      {row.count}
                    </span>
                    <span className="w-28 shrink-0 text-right text-xs tabular-nums text-slate-400">
                      {row.value ? formatINR(row.value) : ""}
                    </span>
                  </div>
                );
              })}
            </div>

            {SIDE_STAGES.some((s) => byStatus[s.status]) && (
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Off the main path
                </p>
                <div className="flex flex-wrap gap-2">
                  {SIDE_STAGES.filter((s) => byStatus[s.status]).map((s) => (
                    <span key={s.status} className="inline-flex items-center gap-1.5">
                      <StatusPill tone={s.tone}>{s.label}</StatusPill>
                      <span className="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-300">
                        {byStatus[s.status].count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {analysis && (
            <div className="grid gap-3 lg:grid-cols-2">
              <LossPanel
                title="We declined"
                subtitle="Gate 1 — our decision. Every line is something IQE could change."
                icon={AlertTriangle}
                tone="warn"
                rows={analysis.we_declined ?? []}
              />
              <LossPanel
                title="Client placed it elsewhere"
                subtitle="Gate 2 — their decision. Mostly outside our control, but the pattern is the only market data there is."
                icon={TrendingUp}
                tone="bad"
                rows={analysis.client_did_not_award ?? []}
              />
            </div>
          )}

          {analysis?.note && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{analysis.note}</p>
          )}
        </>
      )}
    </div>
  );
}

/** "NOGO_RESOURCE" -> "Resource". The panel heading already says which gate
 *  this is, so repeating "Nogo" on every line adds nothing and humanise()
 *  renders it as the non-word "Nogo". */
function subGroup(group?: string | null): string {
  if (!group) return "";
  const [, ...rest] = group.split("_");
  return humanise(rest.join("_") || group);
}

function LossPanel({
  title, subtitle, icon: Icon, tone, rows,
}: {
  title: string;
  subtitle: string;
  icon: any;
  tone: Tone;
  rows: any[];
}) {
  const peak = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card className="p-4">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div>
          <h2 className="font-heading text-sm font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Nothing recorded.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <li key={r.code}>
              <div className="flex items-center gap-2">
                <StatusPill tone={tone}>{r.count}</StatusPill>
                <span className="text-sm text-slate-800 dark:text-slate-200">
                  {r.label}
                </span>
                <span className="text-xs text-slate-400">{subGroup(r.group)}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${
                    tone === "bad" ? "bg-rose-400" : "bg-amber-400"
                  }`}
                  style={{ width: `${(r.count / peak) * 100}%` }}
                />
              </div>
              {/* The remedy is the reason to record the code at all. */}
              {r.remedy_hint && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {r.remedy_hint}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
