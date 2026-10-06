import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getListings, saveListings } from "@/lib/store";
import type { Listing } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ listings: await getListings() });
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function PUT(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { listings?: unknown } | null;
  if (!Array.isArray(b?.listings) || b.listings.length > 300) return NextResponse.json({ error: "invalid listings" }, { status: 400 });
  const out: Listing[] = [];
  for (const [i, r] of (b.listings as Record<string, unknown>[]).entries()) {
    const price = Number(r.price);
    const bhk = Number(r.bhk);
    const carpet = Number(r.carpet);
    const area = str(r.area, 40);
    const title = str(r.title, 80);
    const possession = str(r.possession, 12) || "Ready";
    if (!area || !title || !(price > 0) || !Number.isInteger(bhk) || bhk < 1 || bhk > 6 || !(carpet > 0)) {
      return NextResponse.json({ error: `Row ${i + 1}: title, area, BHK (1-6), price and carpet are required` }, { status: 400 });
    }
    if (possession !== "Ready" && Number.isNaN(Date.parse(possession))) {
      return NextResponse.json({ error: `Row ${i + 1}: possession must be "Ready" or a date like 2027-03-31` }, { status: 400 });
    }
    out.push({
      id: str(r.id, 20) || `L${Date.now().toString(36)}${i}`,
      title,
      area,
      bhk,
      type: r.type === "rent" ? "rent" : "sale",
      price: Math.round(price),
      carpet: Math.round(carpet),
      possession,
      highlight: str(r.highlight, 140),
    });
  }
  await saveListings(out);
  return NextResponse.json({ ok: true, count: out.length });
}
