import { cfg } from "@/lib/config";
import { money, shortSlot } from "@/lib/format";
import type { Analysis, Flags, Lead } from "@/lib/types";

export default function SummaryCard({ lead, analysis, flags }: { lead: Lead; analysis: Analysis; flags: Flags }) {
  return (
    <section className="pop-in rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-4 text-white shadow-lg">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">✓</span>
        Conversation complete
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/15 p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/70">Time to first reply</div>
          <div className="mt-0.5 text-2xl font-extrabold">{cfg.summary.timeToFirstReply}</div>
        </div>
        <div className="rounded-xl bg-white/15 p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/70">Lead score</div>
          <div className="mt-0.5 text-2xl font-extrabold">
            {analysis.score} <span className="text-sm font-semibold">{analysis.hot ? "🔥 HOT" : ""}</span>
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-xl bg-white p-3 text-slate-800">
        <div className="text-[15px] font-bold text-brand-dark">✅ {cfg.summary.capturedLine}</div>
        <p className="mt-1 text-[13px] text-slate-600">
          {lead.name ?? "Customer"} · {lead.bhk}BHK {lead.location} · {lead.budget ? money(lead.budget, lead.listingType) : ""}
          {lead.visitSlot ? ` · visit ${shortSlot(lead.visitSlot)}` : ""}
        </p>
        {flags.humanFollowUp && <p className="mt-1 text-[12px] font-medium text-amber-700">👤 One question was left for your team to confirm.</p>}
      </div>
    </section>
  );
}
