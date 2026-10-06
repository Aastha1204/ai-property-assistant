import { cfg } from "@/lib/config";
import { money, timelineLabel } from "@/lib/format";
import type { Analysis, Flags, Lead } from "@/lib/types";

const LOAN = { "pre-approved": "Pre-approved ✓", needed: "Needed (not approved)", none: "No loan (cash)" } as const;

export default function LeadCard({ lead, flags, analysis, phone }: { lead: Lead; flags: Flags; analysis: Analysis; phone?: string }) {
  const started = analysis.captured > 0;
  const rows: [string, string | null][] = [
    ["Name", lead.name],
    ["Area", lead.location],
    ["Budget", lead.budget ? money(lead.budget, lead.listingType) : null],
    ["BHK", lead.bhk ? `${lead.bhk} BHK${lead.listingType === "rent" ? " · Rent" : ""}` : null],
    ["Purpose", lead.purpose ? (lead.purpose === "self-use" ? "Self-use" : "Investment") : null],
    ["Possession", lead.timelineMonths != null ? timelineLabel(lead.timelineMonths) : null],
    ["Loan", lead.loan ? LOAN[lead.loan] : null],
    ["Site visit", lead.visitSlot],
  ];
  const pct = Math.round((analysis.captured / analysis.total) * 100);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-lg font-bold text-brand-dark">
          {lead.name ? lead.name.charAt(0).toUpperCase() : "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-slate-900">{lead.name ?? "New WhatsApp lead"}</div>
          <div className="text-xs text-slate-500">{started ? `${phone ?? cfg.demoCustomer.phone}${phone ? "" : " · via WhatsApp"}` : "Waiting for first message…"}</div>
        </div>
        {flags.humanFollowUp && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">👤 Needs your follow-up</span>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-right text-[11px] text-slate-400">
        {analysis.captured}/{analysis.total} fields captured
      </div>

      <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg px-2 py-1.5">
            <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
            <dd key={value ?? "empty"} className={`mt-0.5 min-h-[20px] rounded text-[14px] font-medium ${value ? "flash-fill text-slate-900" : "text-slate-300"}`}>
              {value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
