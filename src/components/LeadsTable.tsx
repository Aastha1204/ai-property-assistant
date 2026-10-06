import { SEED_LEADS } from "@/lib/config";
import { interestLabel } from "@/lib/engine";
import type { Analysis, Lead, LeadStatus } from "@/lib/types";

const BADGE: Record<LeadStatus, string> = {
  Hot: "bg-red-100 text-red-700",
  "Follow-up due": "bg-amber-100 text-amber-700",
  New: "bg-sky-100 text-sky-700",
  Closed: "bg-slate-200 text-slate-600",
};

export default function LeadsTable({ lead, analysis }: { lead: Lead; analysis: Analysis }) {
  const live = analysis.captured > 0;
  const rows = [
    ...(live
      ? [{ id: "live", name: lead.name ?? "New visitor", interest: interestLabel(lead), score: analysis.score, status: analysis.status, lastActive: "just now", live: true }]
      : []),
    ...SEED_LEADS.map((l) => ({ ...l, live: false })),
  ];
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <h3 className="mb-2 text-sm font-semibold text-slate-800">Leads</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-1.5 pr-2 font-medium">Lead</th>
              <th className="py-1.5 pr-2 font-medium">Score</th>
              <th className="py-1.5 pr-2 font-medium">Status</th>
              <th className="py-1.5 text-right font-medium">Last active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t border-slate-100 ${r.live ? "pop-in bg-brand-soft" : ""}`}>
                <td className="py-2 pr-2">
                  <div className="font-medium text-slate-900">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.interest}</div>
                </td>
                <td className="py-2 pr-2 font-semibold tabular-nums text-slate-700">{r.score}</td>
                <td className="py-2 pr-2">
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[r.status]}`}>
                    {r.status === "Hot" ? "🔥 " : ""}
                    {r.status}
                  </span>
                </td>
                <td className="py-2 text-right text-xs text-slate-500">{r.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
