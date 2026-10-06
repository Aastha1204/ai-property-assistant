import { NextResponse } from "next/server";
import { cleanPhone, handleCustomerMessage, validId } from "@/lib/handle";
import { getSession } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Resume a website conversation. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!validId(id)) return NextResponse.json({ messages: [] });
  const s = await getSession(id);
  return NextResponse.json({ messages: s?.messages ?? [] });
}

/** Website chat (public). One stored conversation per browser id. */
export async function POST(req: Request) {
  let b: { id?: unknown; text?: unknown; phone?: unknown; name?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const text = typeof b.text === "string" ? b.text.trim() : "";
  if (!validId(b.id) || !text) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const { result } = await handleCustomerMessage({
      id: b.id,
      channel: "web",
      phone: cleanPhone(b.phone),
      name: typeof b.name === "string" ? b.name : undefined,
      text,
    });
    return NextResponse.json({ reply: result.reply, matches: result.matches, slots: result.slots });
  } catch (e) {
    console.error("[live/chat]", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
