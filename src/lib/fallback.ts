import { cfg } from "./config";
import { getAreas, normalizeArea } from "./engine";
import { finalizeTurn } from "./turn";
import { decideNext } from "./engine";
import type { Extracted, Flags, Lang, Lead, Listing, NextAction, TurnResult } from "./types";

/**
 * Offline brain: regex extraction + templates. Used when no LLM key is set, the
 * API fails or is slow, or the visitor's network drops. Keeps the demo alive.
 */

const HINGLISH =
  /\b(hai|hain|chahiye|chahie|chahta|chahti|mein|kya|kitna|kitne|nahi|nahin|haan|aap|mujhe|mera|meri|karna|karo|batao|bataiye|ghar|kab|mahine|mahina|saal|theek|jaldi|lena|dekh|dekhna|wala|liye|bhi|hoga|chalega|abhi|ke|ka|ki|aur|hona|shift)\b/i;
const ENGLISH = /\b(the|i|want|looking|need|for|is|a|my|in|to|please|yes|no|it|am|would|like|can|you|what|how|do|are|we|with|budget|rent|buy)\b/i;

export function detectLang(text: string, prev: Lang): Lang {
  if (/[ऀ-ॿ]/.test(text)) return "hi";
  if (HINGLISH.test(text)) return "hinglish";
  if (ENGLISH.test(text)) return "en";
  return prev;
}

function parseBudget(raw: string, pending: NextAction): number | null {
  const t = raw.replace(/\d\s*[- ]?\s*(bhk|rk)\b/g, " ").replace(/,/g, "");
  let m = t.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores|करोड़|करोड)/);
  if (m) return Math.round(parseFloat(m[1]) * 1e7);
  m = t.match(/(\d+(?:\.\d+)?)\s*(?:l|lac|lacs|lakh|lakhs|लाख)\b/);
  if (m) return Math.round(parseFloat(m[1]) * 1e5);
  m = t.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (m) return Math.round(parseFloat(m[1]) * 1e3);
  m = t.match(/(?:rs\.?|₹|inr)\s*(\d{4,})/);
  if (m) return parseInt(m[1], 10);
  if (pending === "ask_budget") {
    m = t.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
    if (m) {
      const n = parseFloat(m[1]);
      if (n >= 1e5) return Math.round(n);
      if (n < 10) return Math.round(n * 1e7);
      if (n < 1000) return Math.round(n * 1e5);
      return Math.round(n);
    }
  }
  return null;
}

function parseTimeline(t: string, pending: NextAction): number | null {
  let m = t.match(/(\d+)\s*(?:month|months|mahine|mahina|mahino|महीने|महीना|mon)\b/);
  if (m) return parseInt(m[1], 10);
  m = t.match(/(\d+)\s*(?:year|years|yr|saal|sal|साल|वर्ष)/);
  if (m) return parseInt(m[1], 10) * 12;
  m = t.match(/(\d+)\s*(?:week|weeks|hafte|hafta)/);
  if (m) return Math.ceil(parseInt(m[1], 10) / 4);
  if (/immediate|asap|jaldi|turant|ready to move|ready possession|abhi|तुरंत|जल्दी|next month|agle mahine/.test(t)) return 1;
  if (/next year|agle saal/.test(t)) return 12;
  if (pending === "ask_timeline") {
    m = t.match(/^\s*(\d+)\s*$/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function parseSlot(t: string): string | null {
  const slots = cfg.visitSlots;
  const dayOf = (s: string) => (/sat|शनि/.test(s) ? "sat" : /sun|रवि/.test(s) ? "sun" : "");
  const textDay = dayOf(t);
  const hourRe = (s: string) => {
    const m = s.match(/(\d{1,2})(?::(\d{2}))?/);
    return m ? { h: m[1], min: m[2] ?? "00" } : null;
  };
  const tm = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  const exact = slots.find((s) => s.toLowerCase() === t.trim());
  if (exact) return exact;
  const cands = slots.filter((s) => {
    const day = dayOf(s.toLowerCase());
    if (textDay && day !== textDay) return false;
    if (tm) {
      const sh = hourRe(s)!;
      if (sh.h !== tm[1] || sh.min !== (tm[2] ?? "00")) return false;
    } else if (!textDay) return false;
    return true;
  });
  if (cands.length >= 1 && (textDay || tm)) return cands[0];
  if (/\b(first|pehla|pehle wala)\b/.test(t)) return slots[0];
  return null;
}

export function extractFromText(text: string, pending: NextAction): Extracted {
  const t = text.toLowerCase();
  const out: Extracted = {};

  const nm = text.match(/(?:[Ii] am|[Ii]'m|[Mm]y name is|[Tt]his is|[Mm]ain|[Mm]era naam|[Mm]ai)\s+([A-Z][a-z]{1,15})\b/);
  if (nm) out.name = nm[1];

  for (const [alias, area] of Object.entries(cfg.areaAliases)) {
    const hit = /[^\x00-\x7F]/.test(alias) ? t.includes(alias) : new RegExp(`\\b${alias}\\b`).test(t);
    if (hit) {
      out.location = normalizeArea(area) ?? area;
      break;
    }
  }

  if (!out.location) {
    const hit = getAreas().find((a) => new RegExp(`\b${a.toLowerCase()}\b`).test(t));
    if (hit) out.location = hit;
  }

  const bhk = t.match(/(\d)\s*[- ]?\s*(?:bhk|bedroom|bed\b|rk\b)/) ?? t.match(/(\d)\s*बीएचके/);
  if (bhk) out.bhk = parseInt(bhk[1], 10);
  else if (pending === "ask_bhk") {
    const m = t.match(/^\s*([1-6])\s*$/);
    if (m) out.bhk = parseInt(m[1], 10);
  }

  if (/\b(rent|rental|kiraya|kiraye|lease)\b|किराए/.test(t)) out.listingType = "rent";
  else if (/\b(buy|purchase|sale|kharid|kharidna)\b/.test(t)) out.listingType = "sale";

  const budget = parseBudget(t, pending);
  if (budget) out.budget = budget;

  if (/invest|निवेश|returns|rental income/.test(t)) out.purpose = "investment";
  else if (/self|apne|apna|family|rehne|rahne|live in|own use|personal|खुद|अपने|रहने/.test(t)) out.purpose = "self-use";

  const tl = parseTimeline(t, pending);
  if (tl != null) out.timelineMonths = tl;

  if (/not approved|approval pending|approval baaki/.test(t)) out.loan = "needed";
  else if (/pre-?approved|sanctioned|approved|प्री-?अप्रूव्ड/.test(t)) out.loan = "pre-approved";
  else if (/no loan|without loan|\bcash\b|loan nahi|loan nahin|self.?funded|लोन नहीं|कैश/.test(t)) out.loan = "none";
  else if (/\bloan\b|\bemi\b|mortgage|लोन/.test(t)) out.loan = "needed";
  else if (pending === "ask_loan") {
    if (/^\s*(yes|y|haan|ha|han|ji|हाँ|हां)\b/.test(t)) out.loan = "needed";
    else if (/^\s*(no|nahi|nahin|n|नहीं)\b/.test(t)) out.loan = "none";
  }

  const slot = parseSlot(t);
  if (slot) out.visitSlot = slot;
  return out;
}

export function kbAnswer(text: string): string | null {
  const t = text.toLowerCase();
  const hit = cfg.knowledgeBase.find((e) => e.keywords.some((k) => t.includes(k.toLowerCase())));
  return hit ? hit.answer : null;
}

const isQuestion = (t: string) =>
  /\?|^\s*(what|how|do|does|is|are|can|will|kya|kitna|kitne|kaise|kab|kyun|why|which|where)\b/i.test(t);

export function fallbackTurn(text: string, lead: Lead, flags: Flags, listings?: Listing[]): TurnResult {
  const lang = detectLang(text, flags.lang);
  const pending = decideNext(lead, flags);
  const extracted = extractFromText(text, pending);
  const kb = kbAnswer(text);
  const nothing = Object.keys(extracted).length === 0;
  const needsHuman = isQuestion(text) && !kb && nothing;
  return finalizeTurn({
    lead,
    flags,
    extracted,
    reply: null,
    llmAction: null,
    needsHuman,
    lang,
    source: "fallback",
    kbAnswer: kb,
    listings,
  });
}
