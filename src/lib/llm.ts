import { cfg } from "./config";
import { decideNext, getAreas } from "./engine";
import type { Flags, Lead } from "./types";

/** Provider and key come from env: LLM_PROVIDER, LLM_API_KEY, LLM_MODEL, LLM_BASE_URL. */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function buildSystemPrompt(lead: Lead, flags: Flags): string {
  const kb = cfg.knowledgeBase.map((e) => `- ${e.topic}: ${e.answer}`).join("\n");
  return `You are ${cfg.assistantName}, the WhatsApp assistant of ${cfg.businessName}, a real estate broker serving ${cfg.area} (${cfg.city}). The owner is ${cfg.ownerName}.

LANGUAGE: Reply in the customer's language: ${cfg.languageMix.join(", ")}. Match what they type (Hinglish in Roman script -> Hinglish; Devanagari -> Hindi; otherwise English). Keep every reply short, WhatsApp-style: max 2 short sentences, at most one emoji.

KNOWLEDGE BASE (the ONLY facts you may state about the business):
${kb}
Never invent prices, availability, RERA numbers, offers, discounts, addresses or any fact outside this list. Listing cards are rendered by the app, never describe or quote listing details yourself. If you are unsure or the answer is not in the knowledge base, say a team member will confirm and set needs_human=true.

FLOW: Collect these fields, asking ONLY ONE missing field per reply, in this order: location, budget, bhk, purpose (self-use|investment), timeline (months until possession), loan (pre-approved|needed|none). Never re-ask something already known. Extract every field the customer gives, even several at once. Areas we serve: ${getAreas().join(", ")}. Visit slots (use these exact strings): ${cfg.visitSlots.join(" | ")}.

next_action rules (decided AFTER merging your extraction into the current lead): the first missing field in the order -> ask_location|ask_budget|ask_bhk|ask_purpose|ask_timeline|ask_loan. Nothing missing, no visit_slot, matches not shown yet -> show_matches (reply: one line saying top matches are below and asking them to pick a visit slot). Matches already shown, no visit_slot -> offer_slots. visit_slot chosen, not confirmed -> confirm_visit (confirm the slot warmly). Already confirmed -> done.

CURRENT LEAD (JSON): ${JSON.stringify(lead)}
STATE: matchesShown=${flags.matchesShown}, confirmed=${flags.confirmed}, expected next action if the customer adds nothing: ${decideNext(lead, flags)}

OUTPUT: Return ONLY a JSON object, no markdown:
{"reply": string, "language": "en"|"hi"|"hinglish", "extracted": {"name": string|null, "location": string|null, "budget": number|null, "bhk": number|null, "listingType": "sale"|"rent"|null, "purpose": "self-use"|"investment"|null, "timelineMonths": number|null, "loan": "pre-approved"|"needed"|"none"|null, "visitSlot": string|null}, "next_action": string, "needs_human": boolean}
"extracted" contains ONLY what the customer said in the latest message (null otherwise). budget is rupees as an integer (1.2 cr = 12000000; monthly rent in rupees for rentals). Today is ${new Date().toISOString().slice(0, 10)}.`;
}

async function post(url: string, headers: Record<string, string>, body: unknown, ms: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Anthropic needs strictly alternating roles starting with "user". */
function normalize(msgs: ChatTurn[]): ChatTurn[] {
  const out: ChatTurn[] = [];
  for (const m of msgs) {
    const last = out[out.length - 1];
    if (!out.length && m.role === "assistant") continue;
    if (last && last.role === m.role) last.content += `\n${m.content}`;
    else out.push({ ...m });
  }
  return out;
}

export async function callLLM(system: string, history: ChatTurn[], timeoutMs = 8000): Promise<string> {
  const key = process.env.LLM_API_KEY;
  if (!key) throw new Error("LLM_API_KEY not set");
  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  const messages = normalize(history);
  if (!messages.length) throw new Error("no user message");

  if (provider === "anthropic") {
    const base = process.env.LLM_BASE_URL || "https://api.anthropic.com";
    const data = await post(
      `${base}/v1/messages`,
      { "x-api-key": key, "anthropic-version": "2023-06-01" },
      {
        model: process.env.LLM_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 600,
        temperature: 0.3,
        system,
        messages,
      },
      timeoutMs,
    );
    return data.content?.[0]?.text ?? "";
  }

  const base = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const body: Record<string, unknown> = {
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 600,
    messages: [{ role: "system", content: system }, ...messages],
  };
  if (provider === "openai") body.response_format = { type: "json_object" };
  const data = await post(`${base}/chat/completions`, { authorization: `Bearer ${key}` }, body, timeoutMs);
  return data.choices?.[0]?.message?.content ?? "";
}

export function parseJson(raw: string): Record<string, unknown> {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON in LLM output");
  return JSON.parse(m[0]);
}
