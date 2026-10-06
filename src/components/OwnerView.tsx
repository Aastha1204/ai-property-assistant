"use client";
import { cfg } from "@/lib/config";
import type { Analysis, Flags, Lead, TurnJSON } from "@/lib/types";
import type { HotAlert } from "@/lib/useConversation";
import FollowUpQueue from "./FollowUpQueue";
import HotNotification from "./HotNotification";
import LeadCard from "./LeadCard";
import LeadsTable from "./LeadsTable";
import ScoreMeter from "./ScoreMeter";
import SummaryCard from "./SummaryCard";

const NEXT: Record<string, string> = {
  ask_location: "Ask area",
  ask_budget: "Ask budget",
  ask_bhk: "Ask BHK",
  ask_purpose: "Ask self-use / investment",
  ask_timeline: "Ask possession timeline",
  ask_loan: "Ask loan status",
  show_matches: "Show top 3 matches",
  offer_slots: "Offer site-visit slots",
  confirm_visit: "Confirm site visit",
  done: "Lead captured – hand over to owner",
};

interface Props {
  lead: Lead;
  flags: Flags;
  analysis: Analysis;
  lastTurn: TurnJSON | null;
  hot: HotAlert | null;
  finished: boolean;
  onDismissHot: () => void;
}

export default function OwnerView({ lead, flags, analysis, lastTurn, hot, finished, onDismissHot }: Props) {
  return (
    <div className="scroll-thin h-full space-y-3 overflow-y-auto bg-slate-50 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">Owner view</h2>
          <p className="text-xs text-slate-500">Good day, {cfg.ownerName} · updates live as customers chat</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live
        </span>
      </div>

      {hot && <HotNotification alert={hot} onDismiss={onDismissHot} />}
      {finished && <SummaryCard lead={lead} analysis={analysis} flags={flags} />}
      <LeadCard lead={lead} flags={flags} analysis={analysis} />
      <ScoreMeter analysis={analysis} />

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Next step</h3>
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-dark">{NEXT[analysis.nextAction]}</span>
        </div>
        <details className="mt-2 text-xs text-slate-500">
          <summary className="cursor-pointer select-none font-medium text-slate-600">AI payload (JSON)</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-emerald-200">
            {JSON.stringify(lastTurn ?? { status: "waiting for first message" }, null, 2)}
          </pre>
        </details>
      </section>

      <LeadsTable lead={lead} analysis={analysis} />
      <FollowUpQueue lead={lead} flags={flags} analysis={analysis} />
    </div>
  );
}
