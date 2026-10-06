"use client";
import { useEffect, useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import Footer from "@/components/Footer";
import OwnerView from "@/components/OwnerView";
import { cfg } from "@/lib/config";
import { useConversation } from "@/lib/useConversation";

export default function Page() {
  const c = useConversation();
  const [tab, setTab] = useState<"chat" | "owner">("chat");
  const [unseen, setUnseen] = useState(false);
  const demo = c.mode === "demo";

  // Mobile: flag owner-tab updates, and jump there when a lead turns HOT during the demo.
  useEffect(() => {
    if (tab === "chat" && c.analysis.captured > 0) setUnseen(true);
  }, [c.lead, tab, c.analysis.captured]);
  useEffect(() => {
    if (!c.hot || !demo) return;
    const t = setTimeout(() => setTab("owner"), 1600);
    return () => clearTimeout(t);
  }, [c.hot, demo]);
  useEffect(() => {
    if (tab === "owner") setUnseen(false);
  }, [tab]);

  const play = () => {
    setTab("chat");
    setUnseen(false);
    c.playDemo();
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 sm:px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">{cfg.logoText}</div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[15px] font-bold text-slate-900">{cfg.businessName}</div>
          <div className="truncate text-xs text-slate-500">AI Property Assistant · {cfg.area}</div>
        </div>
        {demo ? (
          <button onClick={c.stop} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            ■ Stop
          </button>
        ) : (
          <>
            <button onClick={c.reset} className="hidden rounded-full px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 sm:block">
              Reset
            </button>
            <button onClick={play} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-dark">
              ▶ Play demo
            </button>
          </>
        )}
      </header>

      {/* Mobile tabs */}
      <nav className="grid shrink-0 grid-cols-2 border-b border-slate-200 bg-white lg:hidden" role="tablist">
        {(["chat", "owner"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`relative py-2.5 text-sm font-semibold ${tab === t ? "border-b-2 border-brand text-brand-dark" : "text-slate-500"}`}
          >
            {t === "chat" ? "💬 Customer chat" : "📊 Owner view"}
            {t === "owner" && unseen && tab !== "owner" && (
              <span className={`absolute right-[22%] top-2 h-2.5 w-2.5 rounded-full ${c.analysis.hot ? "pulse-ring bg-red-500" : "bg-brand"}`} />
            )}
          </button>
        ))}
      </nav>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className={`${tab === "chat" ? "block" : "hidden"} min-h-0 min-w-0 lg:block lg:p-4`}>
          <div className="mx-auto h-full max-w-[560px] overflow-hidden lg:rounded-2xl lg:shadow-xl lg:ring-1 lg:ring-slate-300/60">
            <ChatPanel messages={c.messages} typing={c.typing} draft={c.draft} mode={c.mode} onSend={c.sendUser} />
          </div>
        </section>
        <section className={`${tab === "owner" ? "block" : "hidden"} min-h-0 min-w-0 border-l border-slate-200 lg:block`}>
          <OwnerView
            lead={c.lead}
            flags={c.flags}
            analysis={c.analysis}
            lastTurn={c.lastTurn}
            hot={c.hot}
            finished={c.finished}
            onDismissHot={c.dismissHot}
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}
