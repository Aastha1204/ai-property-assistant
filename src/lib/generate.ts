import { fallbackTurn, detectLang } from "./fallback";
import { buildSystemPrompt, callLLM, parseJson, type ChatTurn } from "./llm";
import { finalizeTurn } from "./turn";
import type { Flags, Lang, Lead, Listing, TurnResult } from "./types";

/** One assistant turn: real LLM if available, otherwise (or on any failure) the offline assistant. */
export async function generateTurn(history: ChatTurn[], lead: Lead, flags: Flags, listings?: Listing[]): Promise<TurnResult> {
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  try {
    const j = parseJson(await callLLM(buildSystemPrompt(lead, flags), history));
    const lang: Lang =
      j.language === "hi" || j.language === "hinglish" || j.language === "en" ? j.language : detectLang(lastUser, flags.lang);
    const reply = typeof j.reply === "string" && j.reply.trim() ? j.reply.trim().slice(0, 600) : null;
    return finalizeTurn({
      lead,
      flags,
      extracted: (j.extracted as Record<string, unknown>) ?? {},
      reply,
      llmAction: typeof j.next_action === "string" ? j.next_action : null,
      needsHuman: j.needs_human === true,
      lang,
      source: "llm",
      listings,
    });
  } catch (err) {
    console.warn("[chat] LLM unavailable, using offline assistant:", (err as Error).message);
    return fallbackTurn(lastUser, lead, flags, listings);
  }
}
