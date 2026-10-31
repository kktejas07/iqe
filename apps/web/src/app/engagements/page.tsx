"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/components/feedback";

const LINES = [
  ["EXPEDITING", "Expediting"],
  ["VENDOR_ASSESSMENT", "Vendor assessment"],
  ["ASSET_INTEGRITY", "Asset integrity & advanced NDT"],
  ["EQUIPMENT_DESIGN", "Equipment design"],
  ["TRAINING", "Training"],
];

export default function EngagementsPage() {
  // useSearchParams needs a Suspense boundary when the page is prerendered.
  return <Suspense fallback={null}><Engagements /></Suspense>;
}

function Engagements() {
  const [jobId, setJobId] = useState("");
  // The menu links here with ?line=..., so Asset Integrity, Equipment Design
  // and Training each open on their own service line.
  const wanted = useSearchParams().get("line");
  const [line, setLine] = useState(wanted && LINES.some(([v]) => v === wanted) ? wanted : "EXPEDITING");
  useEffect(() => {
    if (wanted && LINES.some(([v]) => v === wanted)) setLine(wanted);
  }, [wanted]);
  const [eng, setEng] = useState<any>(null);
  const [body, setBody] = useState("{}");
  const [busy, setBusy] = useState(false);

  const err = (e: any, fallback: string) => toast.error(e?.response?.data?.detail ?? fallback);

  async function find() {
    try {
      const rows = await api.listEngagementsForJob(jobId.trim());
      if (rows.length) setEng(await api.getEngagement(rows[rows.length - 1].engagement_id));
      else { setEng(null); toast.error("No engagement on this job yet."); }
    } catch (e) { err(e, "Could not load"); }
  }
  async function open() {
    setBusy(true);
    try { setEng(await api.openEngagement({ job_id: jobId.trim(), service_line: line })); }
    catch (e) { err(e, "Could not open the engagement"); }
    setBusy(false);
  }
  async function complete() {
    setBusy(true);
    try {
      const payload = JSON.parse(body || "{}");
      setEng(await api.completeEngagementStep(eng.engagement_id, eng.next_step, payload));
      setBody("{}");
      toast.success(`${eng.next_step} complete.`);
    } catch (e: any) {
      if (e instanceof SyntaxError) toast.error("The details are not valid JSON.");
      else err(e, "That step could not be completed");
    }
    setBusy(false);
  }

  const next = eng?.flow?.find((s: any) => s.code === eng.next_step);
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold text-gray-900">Service-line engagements</h1>
      <p className="mt-1 text-sm text-gray-500">
        Expediting, vendor assessment, asset integrity, equipment design and training. Each step has its own gate; the reason is shown if one refuses.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="Job id" className="rounded border px-2 py-1" />
        <select value={line} onChange={(e) => setLine(e.target.value)} className="rounded border px-2 py-1">
          {LINES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={open} disabled={busy || !jobId} className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50">Open</button>
        <button onClick={find} disabled={!jobId} className="rounded border px-3 py-1">Find existing</button>
      </div>

      {eng && (
        <div className="mt-6 rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{eng.engagement_id} · {eng.job_id}</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{eng.status}</span>
          </div>
          <ol className="mt-3 space-y-1 text-sm">
            {eng.flow.map((s: any) => (
              <li key={s.code} className={s.done ? "text-green-700" : s.code === eng.next_step ? "font-medium" : "text-gray-400"}>
                {s.done ? "✓" : "○"} {s.code} — {s.title}
                {s.items.length > 0 && !s.done && <span className="ml-2 text-xs text-gray-500">({s.items.join(", ")})</span>}
              </li>
            ))}
          </ol>
          {next && eng.status === "open" && (
            <div className="mt-4">
              <div className="text-sm font-medium">Next: {next.code} — {next.title}</div>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="mt-2 w-full rounded border p-2 font-mono text-xs" />
              <button onClick={complete} disabled={busy} className="mt-2 rounded bg-green-600 px-3 py-1 text-white disabled:opacity-50">Complete {next.code}</button>
            </div>
          )}
          {eng.status === "blocked" && (
            <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">
              Blocked: IQE inspects this item, so it can appraise the design but not produce one. Open a Part B appraisal instead.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
