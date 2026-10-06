import { createHmac, timingSafeEqual } from "crypto";
import { fill } from "./config";
import { money } from "./format";
import { possessionLabel } from "./matcher";
import type { Match } from "./types";

/** WhatsApp Business Cloud API helpers. Env: WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID, WA_VERIFY_TOKEN, WA_APP_SECRET. */
export const waConfigured = () => !!(process.env.WA_ACCESS_TOKEN && process.env.WA_PHONE_NUMBER_ID);

async function post(body: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WA_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });
  if (!res.ok) throw new Error(`WhatsApp send failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export const sendText = (to: string, text: string) => post({ to, type: "text", text: { body: text.slice(0, 4000) } });

export const sendButtons = (to: string, body: string, options: string[]) =>
  post({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body.slice(0, 1000) },
      action: { buttons: options.slice(0, 3).map((o, i) => ({ type: "reply", reply: { id: `slot${i}`, title: o.slice(0, 20) } })) },
    },
  });

export const sendTemplate = (to: string, name: string, lang: string, params: string[]) =>
  post({
    to,
    type: "template",
    template: {
      name,
      language: { code: lang },
      components: [{ type: "body", parameters: params.map((p) => ({ type: "text", text: p })) }],
    },
  });

export function cardText(m: Match): string {
  const l = m.listing;
  return `*${l.title}* – ${money(l.price, l.type)}\n${l.area} · ${l.bhk}BHK · ${l.carpet} sq ft · ${possessionLabel(l)}\n${l.highlight}\n✓ ${m.reason}`;
}

/** Verify Meta's X-Hub-Signature-256 header. Skipped only if WA_APP_SECRET is unset (dev). */
export function signatureOk(raw: string, header: string | null): boolean {
  const secret = process.env.WA_APP_SECRET;
  if (!secret) return true;
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Tell the owner a lead just went HOT. Uses a template if configured (works outside the 24h window). */
export async function notifyOwner(text: string) {
  const to = (process.env.OWNER_WA_NUMBER ?? "").replace(/\D/g, "");
  if (!to || !waConfigured()) return;
  try {
    if (process.env.WA_OWNER_TEMPLATE) {
      await sendTemplate(to, process.env.WA_OWNER_TEMPLATE, process.env.WA_TEMPLATE_LANG || "en", [text]);
    } else {
      await sendText(to, fill(text));
    }
  } catch (e) {
    console.warn("[owner alert]", (e as Error).message);
  }
}
