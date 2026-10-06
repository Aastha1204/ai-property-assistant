import { NextResponse } from "next/server";
import { kvGet, kvSet, persistent } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validRoom = (r: unknown): r is string => typeof r === "string" && /^[a-z0-9]{4,24}$/.test(r);

/** Demo-only: lets /whatsapp (e.g. on a phone) drive /owner (e.g. on a laptop) through a shared room code. */
export async function GET(req: Request) {
  const room = new URL(req.url).searchParams.get("room");
  if (!validRoom(room)) return NextResponse.json({ error: "bad room" }, { status: 400 });
  const raw = await kvGet(`demo:${room}`);
  return NextResponse.json({ state: raw ? JSON.parse(raw) : null, persistent });
}

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 30000) return NextResponse.json({ error: "too large" }, { status: 413 });
  let b: { room?: unknown; state?: unknown };
  try {
    b = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!validRoom(b.room) || typeof b.state !== "object" || b.state === null) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await kvSet(`demo:${b.room}`, JSON.stringify(b.state), 6 * 3600);
  return NextResponse.json({ ok: true });
}
