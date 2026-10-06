import { NextResponse } from "next/server";
import { adminEnabled, COOKIE, passwordOk, sessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!adminEnabled()) return NextResponse.json({ error: "ADMIN_PASSWORD is not set on the server" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { password?: string };
  if (!b.password || !passwordOk(b.password)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, sessionToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 14 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
