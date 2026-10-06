import { NextResponse } from "next/server";
import { adminEnabled, isAuthed } from "@/lib/auth";
import { persistent } from "@/lib/store";
import { waConfigured } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Booleans only — never returns secrets. Without a cookie it just says whether login is possible. */
export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ authed: false, adminEnabled: adminEnabled() });
  return NextResponse.json({
    authed: true,
    adminEnabled: true,
    llm: !!process.env.LLM_API_KEY,
    llmProvider: process.env.LLM_PROVIDER || "anthropic",
    database: persistent,
    whatsapp: waConfigured(),
    whatsappSecurity: !!process.env.WA_APP_SECRET,
    ownerAlerts: !!process.env.OWNER_WA_NUMBER,
    followUpTemplate: !!process.env.WA_FOLLOWUP_TEMPLATE,
    cron: !!process.env.CRON_SECRET,
  });
}
