"use client";
import { useEffect, useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import { cfg } from "@/lib/config";
import { useConversation } from "@/lib/useConversation";

/** Page 1: the customer's WhatsApp chatbot. Syncs live with /owner in the same browser. */
export default function WhatsAppPage() {
  const [room, setRoom] = useState<string | null>(null);
  const c = useConversation({ sync: true, room });
  const demo = c.mode === "demo";

  // /whatsapp?autoplay=1 starts the scripted demo on load (used by the owner page button).
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("room");
    if (r && /^[a-z0-9]{4,24}$/.test(r)) setRoom(r);
  }, []);
  const { playDemo } = c;
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("autoplay") === "1") {
      const t = setTimeout(playDemo, 600);
      return () => clearTimeout(t);
    }
  }, [playDemo]);

  return (
    <div className="flex h-dvh flex-col bg-[#dfe5e7]">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2 sm:px-5">
        <div className="min-w-0 flex-1 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Customer view</span> · see the owner dashboard live at{" "}
          <a href={room ? `/owner?room=${room}` : "/owner"} target="_blank" rel="noreferrer" className="font-semibold text-brand-dark underline">
            /owner
          </a>
          {room && <span className="ml-1 text-emerald-700">· linked ●</span>}
        </div>
        {demo ? (
          <button onClick={c.stop} className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700">
            ■ Stop
          </button>
        ) : (
          <>
            <button onClick={c.reset} className="rounded-full px-3 py-1.5 text-sm text-slate-600 hover:bg-white/60">
              Reset
            </button>
            <button onClick={c.playDemo} className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-brand-dark">
              ▶ Play demo
            </button>
          </>
        )}
      </div>
      <div className="mx-auto min-h-0 w-full max-w-[460px] flex-1 overflow-hidden sm:mb-3 sm:rounded-[28px] sm:shadow-2xl sm:ring-8 sm:ring-slate-900">
        <ChatPanel messages={c.messages} typing={c.typing} draft={c.draft} mode={c.mode} onSend={c.sendUser} hideBadge />
      </div>
      <div className="shrink-0 pb-1.5 text-center text-[11px] text-slate-500">{cfg.demoLabel}</div>
    </div>
  );
}
