import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { validId } from "@/lib/handle";
import { deleteSession, getSession, saveSession } from "@/lib/store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const s = await getSession(id);
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { closed?: boolean; clearHuman?: boolean };
  if (typeof b.closed === "boolean") s.closed = b.closed;
  if (b.clearHuman) s.flags.humanFollowUp = false;
  await saveSession(s);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  await deleteSession(id);
  return NextResponse.json({ ok: true });
}
