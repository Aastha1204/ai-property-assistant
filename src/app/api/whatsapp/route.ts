import { after, NextResponse } from "next/server";
import { handleCustomerMessage } from "@/lib/handle";
import { claim } from "@/lib/store";
import { cardText, sendButtons, sendText, signatureOk, waConfigured } from "@/lib/whatsapp";
import { cfg } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Meta webhook verification handshake. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  if (q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === process.env.WA_VERIFY_TOKEN && process.env.WA_VERIFY_TOKEN) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

interface WaMessage {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
}

async function processMessage(m: WaMessage, profileName?: string) {
  if (!(await claim(`wamid:${m.id}`))) return; // Meta retries; answer each message once
  const text = m.type === "text" ? m.text?.body : m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title;
  if (!text?.trim()) {
    await sendText(m.from, `Please send a text message 🙂 — ${cfg.businessName}`);
    return;
  }
  try {
    const { result } = await handleCustomerMessage({ id: `wa:${m.from}`, channel: "whatsapp", phone: m.from, name: profileName, text });
    if (result.slots && !result.matches) {
      await sendButtons(m.from, result.reply, result.slots);
      return;
    }
    await sendText(m.from, result.reply);
    for (const mt of result.matches ?? []) await sendText(m.from, cardText(mt));
    if (result.slots) await sendButtons(m.from, "📅", result.slots);
  } catch (e) {
    console.error("[whatsapp]", e);
    await sendText(m.from, "Sorry, something went wrong. A team member will get back to you shortly 🙏").catch(() => {});
  }
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!signatureOk(raw, req.headers.get("x-hub-signature-256"))) return new Response("bad signature", { status: 401 });
  if (!waConfigured()) return NextResponse.json({ ok: true });
  let body: { entry?: { changes?: { value?: { messages?: WaMessage[]; contacts?: { profile?: { name?: string } }[] } }[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  // Acknowledge immediately; do the (slow) LLM work after the response.
  after(async () => {
    for (const e of body.entry ?? [])
      for (const c of e.changes ?? [])
        for (const m of c.value?.messages ?? []) await processMessage(m, c.value?.contacts?.[0]?.profile?.name);
  });
  return NextResponse.json({ ok: true });
}
