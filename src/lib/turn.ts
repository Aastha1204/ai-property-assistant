import { cfg } from "./config";
import { analyze, applyExtraction, decideNext } from "./engine";
import { topMatches } from "./matcher";
import { buildReply } from "./templates";
import type { Flags, Lang, Lead, Listing, NextAction, TurnResult } from "./types";

/**
 * Single source of truth for one assistant turn. Both the LLM path and the
 * offline fallback end here, so the dashboard always renders the same JSON shape.
 * The server (not the model) decides the next action and computes the score, so
 * a creative model can never skip a question or invent a lead score.
 */
export function finalizeTurn(i: {
  lead: Lead;
  flags: Flags;
  extracted: Record<string, unknown> | undefined | null;
  reply: string | null;
  llmAction: string | null;
  needsHuman: boolean;
  lang: Lang;
  source: "llm" | "fallback";
  kbAnswer?: string | null;
  listings?: Listing[];
}): TurnResult {
  // A visit slot only counts once the customer has actually seen matches to visit.
  const extracted = i.extracted && !i.flags.matchesShown ? { ...i.extracted, visitSlot: null } : i.extracted;
  const { lead, changed } = applyExtraction(i.lead, extracted);
  const flags: Flags = { ...i.flags, lang: i.lang, humanFollowUp: i.flags.humanFollowUp || i.needsHuman };

  const action: NextAction = decideNext(lead, flags);
  const firstName = !i.lead.name && !!lead.name;

  // Trust the model's wording only when it agrees with the server's decision.
  const reply =
    i.reply && i.llmAction === action
      ? i.reply
      : buildReply({
          action,
          lang: i.lang,
          lead,
          changed,
          kbAnswer: i.kbAnswer,
          needsHuman: i.needsHuman,
          firstName,
        });

  let matches;
  let slots;
  if (action === "show_matches") {
    matches = topMatches(lead, 3, i.listings);
    slots = cfg.visitSlots;
    flags.matchesShown = true;
  } else if (action === "offer_slots") {
    slots = cfg.visitSlots;
  } else if (action === "confirm_visit") {
    flags.confirmed = true;
  }

  const a = analyze(lead, flags);
  return {
    reply,
    matches,
    slots,
    lead,
    flags,
    turn: {
      language: i.lang,
      extracted: changed,
      score: a.score,
      hot: a.hot,
      action,
      next_action: a.nextAction,
      needs_human: flags.humanFollowUp,
      source: i.source,
    },
  };
}
