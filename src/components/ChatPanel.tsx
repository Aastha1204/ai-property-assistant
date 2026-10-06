"use client";
import { useEffect, useRef, useState } from "react";
import { AREAS, cfg } from "@/lib/config";
import { clock } from "@/lib/format";
import type { Mode } from "@/lib/useConversation";
import type { ChatMessage } from "@/lib/types";
import PropertyCard from "./PropertyCard";

const SUGGESTIONS = [
  `2BHK chahiye ${AREAS[0]} mein, budget 1.2 cr`,
  `Looking for 1BHK on rent in ${AREAS[3] ?? AREAS[0]}, 35k`,
  `${AREAS[1] ?? AREAS[0]} mein investment ke liye flat dekhna hai`,
];

interface Props {
  messages: ChatMessage[];
  typing: boolean;
  draft: string;
  mode: Mode;
  onSend: (text: string) => void;
  hideBadge?: boolean;
}

export default function ChatPanel({ messages, typing, draft, mode, onSend, hideBadge }: Props) {
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const demo = mode === "demo";
  const lastIdx = messages.length - 1;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (demo || !text.trim()) return;
    onSend(text);
    setText("");
  };
  const value = demo ? draft : text;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* WhatsApp-style header */}
      <div className="flex items-center gap-3 bg-brand px-4 py-2.5 text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-brand-dark">
          {cfg.logoText}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-tight">{cfg.businessName}</div>
          <div className="text-xs text-white/80">{typing ? "typing…" : "online · replies instantly"}</div>
        </div>
        {!hideBadge && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium tracking-wide">Customer view</span>}
      </div>

      {/* Messages */}
      <div ref={scroller} className="chat-wallpaper scroll-thin flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {messages.map((m, i) => {
          const mine = m.role === "customer";
          const slotsLive = !!m.slots && i === lastIdx && !demo;
          return (
            <div key={m.id} className={`pop-in flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-[14.5px] leading-snug shadow-sm ${
                  mine ? "rounded-tr-none bg-[#d9fdd3]" : "rounded-tl-none bg-white"
                }`}
              >
                {m.text}
                <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                  {clock(m.ts)}
                  {mine && <span className="text-sky-500">✓✓</span>}
                </div>
              </div>
              {m.matches && (
                <div className="mt-2 w-[88%] max-w-[330px] space-y-2">
                  {m.matches.map((mt, k) => (
                    <PropertyCard key={mt.listing.id} match={mt} rank={k} />
                  ))}
                </div>
              )}
              {m.slots && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.slots.map((s) => (
                    <button
                      key={s}
                      disabled={!slotsLive}
                      onClick={() => onSend(s)}
                      className="rounded-full border border-brand bg-white px-3 py-1.5 text-[13px] font-medium text-brand-dark shadow-sm transition enabled:hover:bg-brand-soft disabled:opacity-70"
                    >
                      📅 {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {typing && (
          <div className="flex">
            <div className="flex items-center gap-1 rounded-lg rounded-tl-none bg-white px-3 py-3 shadow-sm">
              <span className="dot h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span className="dot h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span className="dot h-1.5 w-1.5 rounded-full bg-slate-400" />
            </div>
          </div>
        )}
      </div>

      {/* Suggestions + input */}
      <div className="bg-[#f0f2f5] px-3 pb-3 pt-2">
        {messages.length <= 1 && mode === "idle" && (
          <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSend(s)}
                className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-brand-soft"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="flex items-center gap-2">
          <input
            value={value}
            readOnly={demo}
            onChange={(e) => setText(e.target.value)}
            placeholder={demo ? "" : "Type a message (English / हिंदी / Hinglish)"}
            className="min-w-0 flex-1 rounded-full border-0 bg-white px-4 py-2.5 text-[14.5px] outline-none ring-1 ring-slate-200 focus:ring-brand"
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={demo || !text.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white transition disabled:opacity-50"
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
              <path d="M2 21 23 12 2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
