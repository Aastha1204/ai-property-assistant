import { randomUUID } from "crypto";
import { analyze, applyExtraction, EMPTY_LEAD, hotAlertText, INITIAL_FLAGS } from "./engine";
import { generateTurn } from "./generate";
import { getListings, getSession, saveSession } from "./store";
import { notifyOwner } from "./whatsapp";
import type { Session, TurnResult } from "./types";

export const validId = (id: unknown): id is string => typeof id === "string" && /^[A-Za-z0-9:_-]{6,64}$/.test(id);
export const cleanPhone = (p: unknown) => {
  const d = String(p ?? "").replace(/\D/g, "");
  return d.length >= 10 && d.length <= 15 ? d : undefined;
};

/** Shared by the website chat and the WhatsApp webhook: load, run a turn, persist, alert owner. */
export async function handleCustomerMessage(o: {
  id: string;
  channel: "web" | "whatsapp";
  phone?: string;
  name?: string;
  text: string;
}): Promise<{ session: Session; result: TurnResult }> {
  const now = Date.now();
  let s = await getSession(o.id);
  if (!s) {
    const lead = o.name ? applyExtraction(EMPTY_LEAD, { name: o.name }).lead : { ...EMPTY_LEAD };
    s = {
      id: o.id,
      channel: o.channel,
      phone: o.phone,
      lead,
      flags: { ...INITIAL_FLAGS },
      messages: [],
      createdAt: now,
      updatedAt: now,
      lastCustomerAt: now,
    };
  }
  if (s.messages.length >= 200) throw new Error("conversation limit reached");

  s.messages.push({ id: randomUUID(), role: "customer", text: o.text.slice(0, 500), ts: now });
  s.lastCustomerAt = now;
  s.followUpSentAt = undefined;

  const history = s.messages.map((m) => ({
    role: m.role === "customer" ? ("user" as const) : ("assistant" as const),
    content: m.text,
  }));
  const result = await generateTurn(history, s.lead, s.flags, await getListings());
  s.lead = result.lead;
  s.flags = result.flags;
  s.messages.push({ id: randomUUID(), role: "assistant", text: result.reply, ts: Date.now(), matches: result.matches, slots: result.slots });
  s.updatedAt = Date.now();

  const becameHot = analyze(s.lead, s.flags).hot && !s.hotNotified;
  if (becameHot) s.hotNotified = true;
  await saveSession(s);
  if (becameHot) await notifyOwner(`${hotAlertText(s.lead)}${s.phone ? ` · +${s.phone}` : ""}`);
  return { session: s, result };
}
