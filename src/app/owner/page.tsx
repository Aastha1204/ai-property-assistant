"use client";
import { useEffect, useState } from "react";
import OwnerView from "@/components/OwnerView";
import { cfg } from "@/lib/config";
import { EMPTY_LEAD, INITIAL_FLAGS, analyze } from "@/lib/engine";
import { useOwnerSync } from "@/lib/useOwnerSync";

const newRoom = () => Math.random().toString(36).slice(2, 8).padEnd(6, "x");

/** Page 2: the website the client (broker) gets. Updates live while a customer chats on /whatsapp, on any device. */
export default function OwnerPage() {
  const [room, setRoom] = useState<string | null>(null);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  // Room code lives in the URL so the page can be reloaded or shared.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    let r = p.get("room");
    if (!r || !/^[a-z0-9]{4,24}$/.test(r)) {
      r = newRoom();
      p.set("room", r);
      window.history.replaceState(null, "", `?${p.toString()}`);
    }
    setRoom(r);
  }, []);

  const chatUrl = room && typeof window !== "undefined" ? `${window.location.origin}/whatsapp?room=${room}` : "";
  const playUrl = chatUrl ? `${chatUrl}&autoplay=1` : "/whatsapp?autoplay=1";

  useEffect(() => {
    if (!chatUrl) return;
    import("qrcode").then((Q) => Q.toDataURL(chatUrl, { margin: 1, width: 220 })).then(setQr).catch(() => {});
  }, [chatUrl]);

  const s = useOwnerSync(room);
  const lead = s?.lead ?? EMPTY_LEAD;
  const flags = s?.flags ?? INITIAL_FLAGS;
  const analysis = analyze(lead, flags);
  const hot = s?.hot && s.hot.text !== dismissed ? s.hot : null;
  const idle = analysis.captured === 0;

  return (
    <div className="flex h-dvh flex-col bg-slate-50">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">{cfg.logoText}</div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[15px] font-bold text-slate-900">{cfg.businessName}</div>
          <div className="truncate text-xs text-slate-500">AI Property Assistant · Owner dashboard</div>
        </div>
        <a href={chatUrl || "/whatsapp"} target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          💬 Open customer chat
        </a>
        <a href={playUrl} target="_blank" rel="noreferrer" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-dark">
          ▶ Play demo
        </a>
      </header>

      {idle && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center gap-4">
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR code to open the customer chat" width={84} height={84} className="rounded-lg bg-white p-1 ring-1 ring-amber-200" />
            )}
            <div className="min-w-0 text-[13px] text-amber-900">
              <b>Waiting for a customer chat.</b> Scan the QR with your phone (or press <b>Play demo</b>) and chat as the customer. This dashboard fills in live, on any device.
              {chatUrl && (
                <button
                  onClick={() => navigator.clipboard?.writeText(chatUrl).then(() => setCopied(true))}
                  className="mt-1 block text-xs font-semibold text-amber-800 underline"
                >
                  {copied ? "Link copied ✓" : "Copy chat link"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto min-h-0 w-full max-w-3xl flex-1">
        <OwnerView
          lead={lead}
          flags={flags}
          analysis={analysis}
          lastTurn={s?.lastTurn ?? null}
          hot={hot}
          finished={flags.confirmed}
          onDismissHot={() => s?.hot && setDismissed(s.hot.text)}
        />
      </main>
      <footer className="shrink-0 border-t border-slate-200 bg-white/80 py-1.5 text-center text-[11px] text-slate-400">{cfg.demoLabel}</footer>
    </div>
  );
}
