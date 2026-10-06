import { NextResponse } from "next/server";
import { generateTurn } from "@/lib/generate";
import { EMPTY_LEAD, INITIAL_FLAGS } from "@/lib/engine";
import type { ChatTurn } from "@/lib/llm";
import { fallbackTurn } from "@/lib/fallback";
import type { Flags, Lead } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Stateless endpoint used by the demo page (state lives in the browser). */
export async function POST(req: Request) {
  let body: { history?: ChatTurn[]; lead?: Lead; flags?: Flags };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const history = (body.history ?? []).filter((m) => m && typeof m.content === "string").slice(-20);
  const lead: Lead = { ...EMPTY_LEAD, ...(body.lead ?? {}) };
  const flags: Flags = { ...INITIAL_FLAGS, ...(body.flags ?? {}) };
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  if (!lastUser.trim()) return NextResponse.json({ error: "empty message" }, { status: 400 });
  try {
    return NextResponse.json(await generateTurn(history, lead, flags));
  } catch {
    return NextResponse.json(fallbackTurn(lastUser, lead, flags));
  }
}
