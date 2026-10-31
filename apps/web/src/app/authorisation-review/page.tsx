"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/feedback";

export default function AuthorisationReviewPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  async function load() {
    try { setRows(await api.getAuthorizationsDue(90)); }
    catch (e: any) { toast.error(e?.response?.data?.detail ?? "Could not load the review list"); }
  }
  useEffect(() => { load(); }, []);

  async function act(id: string, kind: "recommend" | "renew" | "lapse") {
    setBusy(id);
    try {
      if (kind === "recommend") await api.recommendAuthorizationRenewal(id, notes[id] ?? "");
      else if (kind === "renew") await api.renewAuthorization(id, notes[id]);
      toast.success(kind === "recommend" ? "Appraisal recorded." : "Renewed for a year.");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "That was refused");
    } finally { setBusy(""); }
  }

  async function lapse() {
    try {
      const r = await api.lapseOverdueAuthorizations();
      toast.success(r.count ? `${r.count} lapsed authorisation(s) marked expired.` : "Nothing has lapsed.");
      await load();
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? "Could not run the lapse check"); }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yearly authorisation review</h1>
          <p className="mt-1 text-sm text-gray-500">
            The Technical Manager appraises each person and recommends renewal; the Country Manager renews or lets it lapse.
            Nobody works on an authorisation that is past its review.
          </p>
        </div>
        <button onClick={lapse} className="rounded border px-3 py-1 text-sm">Mark lapsed as expired</button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No authorisation is due for review in the next 90 days.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-1">Person</th><th>Scope</th><th>Due</th><th>Appraisal</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.authorization_id} className="border-b align-top">
                <td className="py-2">{r.person_id}</td>
                <td>{(r.service_lines || []).join(", ")}</td>
                <td className={r.overdue ? "font-medium text-red-700" : ""}>
                  {new Date(r.due).toLocaleDateString("en-IN")}{r.overdue ? " (overdue)" : ""}
                </td>
                <td>
                  <input
                    value={notes[r.authorization_id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [r.authorization_id]: e.target.value })}
                    placeholder={r.renewal_recommended ? "Appraised — add a renewal note" : "What was reviewed"}
                    className="w-64 rounded border px-2 py-1"
                  />
                </td>
                <td className="space-x-2 whitespace-nowrap">
                  <button disabled={busy === r.authorization_id || !(notes[r.authorization_id] ?? "").trim()}
                    onClick={() => act(r.authorization_id, "recommend")}
                    className="rounded border px-2 py-1 disabled:opacity-50">Recommend renewal</button>
                  <button disabled={busy === r.authorization_id || !r.renewal_recommended}
                    onClick={() => act(r.authorization_id, "renew")}
                    className="rounded bg-blue-600 px-2 py-1 text-white disabled:opacity-50">Renew</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
