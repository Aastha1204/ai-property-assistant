import { NextResponse } from "next/server";
import { interestLabel } from "@/lib/engine";
import { listSessions, saveSession } from "@/lib/store";
import { sendTemplate, waConfigured } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Daily job (vercel.json). Sends the approved follow-up template to WhatsApp leads
 * who went quiet for 24h. WhatsApp only allows templates outside the 24h window.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });

  const template = process.env.WA_FOLLOWUP_TEMPLATE;
  if (!template || !waConfigured()) return NextResponse.json({ sent: 0, note: "WA_FOLLOWUP_TEMPLATE / WhatsApp not configured" });

  let sent = 0;
  for (const s of await listSessions(300)) {
    const quiet = Date.now() - s.lastCustomerAt >= 24 * 3600 * 1000;
    if (s.channel !== "whatsapp" || !s.phone || s.closed || s.flags.confirmed || s.followUpSentAt || !quiet) continue;
    try {
      await sendTemplate(s.phone, template, process.env.WA_TEMPLATE_LANG || "en", [s.lead.name ?? "there", interestLabel(s.lead)]);
      s.followUpSentAt = Date.now();
      await saveSession(s);
      sent++;
    } catch (e) {
      console.warn("[followup]", s.id, (e as Error).message);
    }
  }
  return NextResponse.json({ sent });
}
