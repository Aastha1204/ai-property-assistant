import { SEED_LEADS, cfg, fill } from "@/lib/config";
import { interestLabel } from "@/lib/engine";
import type { Analysis, Flags, Lang, Lead } from "@/lib/types";

const render = (lang: Lang, name: string, interest: string) => fill(cfg.followUp[lang], { name, interest });

export default function FollowUpQueue({ lead, flags, analysis }: { lead: Lead; flags: Flags; analysis: Analysis }) {
  const items = [
    ...(analysis.captured > 0
      ? [
          {
            id: "live",
            name: lead.name ?? "New visitor",
            when: "Sends after 24 h of silence",
            msg: render(flags.lang, lead.name ?? "there", interestLabel(lead)),
            live: true,
          },
        ]
      : []),
    ...SEED_LEADS.filter((l) => l.status !== "Hot").map((l) => ({
      id: l.id,
      name: l.name,
      when: l.followUpIn,
      msg: render(l.lang, l.name.split(" ")[0], l.interest),
      live: false,
    })),
  ].slice(0, 4);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <h3 className="text-sm font-semibold text-slate-800">Follow-up queue</h3>
      <p className="mb-2 text-xs text-slate-500">Auto-sent on WhatsApp if a customer goes quiet for 24 hours.</p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className={`rounded-xl border border-slate-100 p-2.5 ${it.live ? "pop-in bg-brand-soft" : "bg-slate-50"}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">{it.name}</span>
              <span className="text-slate-500">⏱ {it.when}</span>
            </div>
            <p className="mt-1 whitespace-pre-line rounded-lg rounded-tl-none bg-[#d9fdd3] px-2.5 py-1.5 text-[13px] leading-snug text-slate-800">
              {it.msg}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
