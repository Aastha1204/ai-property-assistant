import { AREAS, cfg } from "./config";
import { inr, shortSlot, timelineLabel } from "./format";
import type { Analysis, Extracted, Flags, Lead, LeadStatus, NextAction, Reason } from "./types";

export const EMPTY_LEAD: Lead = {
  name: null,
  location: null,
  budget: null,
  bhk: null,
  listingType: null,
  purpose: null,
  timelineMonths: null,
  loan: null,
  visitSlot: null,
};
export const INITIAL_FLAGS: Flags = { matchesShown: false, confirmed: false, humanFollowUp: false, lang: "en" };

/** Questions are asked one at a time, in this order, only if still missing. */
const ORDER: { key: keyof Lead; action: NextAction }[] = [
  { key: "location", action: "ask_location" },
  { key: "budget", action: "ask_budget" },
  { key: "bhk", action: "ask_bhk" },
  { key: "purpose", action: "ask_purpose" },
  { key: "timelineMonths", action: "ask_timeline" },
  { key: "loan", action: "ask_loan" },
];

export function decideNext(lead: Lead, flags: Flags): NextAction {
  for (const o of ORDER) if (lead[o.key] == null) return o.action;
  if (lead.visitSlot) return flags.confirmed ? "done" : "confirm_visit";
  return flags.matchesShown ? "offer_slots" : "show_matches";
}

let dynamicAreas: string[] = [];
/** Server registers areas from the live (editable) listings. */
export function registerAreas(a: string[]) {
  dynamicAreas = a;
}
export const getAreas = () => Array.from(new Set([...AREAS, ...dynamicAreas]));

export function normalizeArea(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  if (!t) return null;
  const alias = cfg.areaAliases[t];
  if (alias) return alias;
  return getAreas().find((a) => a.toLowerCase() === t) ?? null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/** Validate + merge extracted fields. Returns the new lead and what actually changed. */
export function applyExtraction(lead: Lead, raw: Record<string, unknown> | undefined | null) {
  const next: Lead = { ...lead };
  const changed: Extracted = {};
  if (!raw) return { lead: next, changed };
  const put = (k: keyof Lead, v: unknown) => {
    if (v == null || next[k] === v) return;
    (next as unknown as Record<string, unknown>)[k] = v;
    (changed as Record<string, unknown>)[k] = v;
  };

  if (typeof raw.name === "string") {
    const n = raw.name.trim().replace(/[^\p{L} .'-]/gu, "").slice(0, 30);
    if (n) put("name", n.charAt(0).toUpperCase() + n.slice(1));
  }
  put("location", normalizeArea(raw.location));
  const budget = num(raw.budget);
  if (budget && budget > 0 && budget < 1e11) put("budget", Math.round(budget));
  const bhk = num(raw.bhk);
  if (bhk && Number.isInteger(bhk) && bhk >= 1 && bhk <= 6) put("bhk", bhk);
  if (raw.listingType === "sale" || raw.listingType === "rent") put("listingType", raw.listingType);
  if (raw.purpose === "self-use" || raw.purpose === "investment") put("purpose", raw.purpose);
  const tl = num(raw.timelineMonths);
  if (tl != null && tl >= 0 && tl <= 120) put("timelineMonths", Math.round(tl));
  if (raw.loan === "pre-approved" || raw.loan === "needed" || raw.loan === "none") put("loan", raw.loan);
  if (typeof raw.visitSlot === "string") {
    const slot = cfg.visitSlots.find((s) => s.toLowerCase() === (raw.visitSlot as string).trim().toLowerCase());
    if (slot) put("visitSlot", slot);
  }
  return { lead: next, changed };
}

/** Deterministic lead scoring. 70+ = HOT. Every point has a visible reason. */
export function analyze(lead: Lead, flags: Flags): Analysis {
  const reasons: Reason[] = [];

  // Budget clarity (25): budget 15 + location/BHK 10
  let b = lead.budget ? 15 : 0;
  b += lead.location && lead.bhk ? 10 : lead.location || lead.bhk ? 5 : 0;
  const bState = b >= 25 ? "ok" : b > 0 ? "partial" : "no";
  reasons.push({
    key: "budget",
    label: "Budget clarity",
    points: b,
    max: 25,
    state: bState,
    note: lead.budget
      ? `Budget ${inr(lead.budget)}${lead.listingType === "rent" ? "/mo" : ""}${
          lead.bhk && lead.location ? ` for ${lead.bhk}BHK in ${lead.location}` : ""
        } stated`
      : "Budget not shared yet",
  });

  // Timeline under 3 months (25)
  const tl = lead.timelineMonths;
  const tPts = tl == null ? 0 : tl <= 3 ? 25 : tl <= 6 ? 10 : 0;
  reasons.push({
    key: "timeline",
    label: "Timeline under 3 months",
    points: tPts,
    max: 25,
    state: tPts === 25 ? "ok" : tPts > 0 ? "partial" : "no",
    note: tl == null ? "Timeline not shared yet" : `${timelineLabel(tl)} – ${tl <= 3 ? "urgent buyer" : "not urgent"}`,
  });

  // Site visit booked (35)
  reasons.push({
    key: "visit",
    label: "Site visit booked",
    points: lead.visitSlot ? 35 : 0,
    max: 35,
    state: lead.visitSlot ? "ok" : "no",
    note: lead.visitSlot ? `Booked ${lead.visitSlot}` : "No site visit yet",
  });

  // Loan pre-approved (15) – cash buyers are equally ready
  const lPts = lead.loan === "pre-approved" || lead.loan === "none" ? 15 : lead.loan === "needed" ? 5 : 0;
  reasons.push({
    key: "loan",
    label: "Loan pre-approved",
    points: lPts,
    max: 15,
    state: lPts === 15 ? "ok" : lPts > 0 ? "partial" : "no",
    note:
      lead.loan === "pre-approved"
        ? "Loan already pre-approved"
        : lead.loan === "none"
          ? "Cash buyer – no loan needed"
          : lead.loan === "needed"
            ? "Needs a loan, not pre-approved yet"
            : "Loan status not shared yet",
  });

  const score = reasons.reduce((s, r) => s + r.points, 0);
  const hot = score >= 70;
  const captured = (Object.values(lead) as unknown[]).filter((v) => v != null).length;
  return {
    score,
    hot,
    status: hot ? "Hot" : "New",
    reasons,
    nextAction: decideNext(lead, flags),
    captured,
    total: Object.keys(lead).length - 1, // listingType is inferred, not counted
  };
}

export function hotAlertText(lead: Lead): string {
  const parts = [
    lead.name ?? "New lead",
    `${lead.bhk ?? "?"}BHK ${lead.location ?? ""}`.trim(),
    lead.budget ? inr(lead.budget) : "",
  ].filter(Boolean);
  return `🔥 Hot lead – ${parts.join(", ")}${lead.visitSlot ? `, site visit ${shortSlot(lead.visitSlot)}` : ""}`;
}

export function interestLabel(lead: Lead): string {
  const bits = [
    lead.bhk ? `${lead.bhk}BHK` : "",
    lead.listingType === "rent" ? "rent" : "",
    lead.location ?? "",
    lead.budget ? `· ${inr(lead.budget)}${lead.listingType === "rent" ? "/mo" : ""}` : "",
  ].filter(Boolean);
  return bits.join(" ") || "Enquiry started";
}

/** Status shown in the admin table for a stored conversation. */
export function sessionStatus(s: { lead: Lead; flags: Flags; closed?: boolean; lastCustomerAt: number }): LeadStatus {
  if (s.closed) return "Closed";
  if (analyze(s.lead, s.flags).hot) return "Hot";
  if (Date.now() - s.lastCustomerAt > 24 * 3600 * 1000 && !s.flags.confirmed) return "Follow-up due";
  return "New";
}
