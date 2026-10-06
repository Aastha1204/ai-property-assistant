import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listSessions, persistent } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ persistent, sessions: await listSessions() });
}
