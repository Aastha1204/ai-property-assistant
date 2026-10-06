"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import { cfg, fill } from "@/lib/config";
import type { ChatMessage } from "@/lib/types";

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode */
    }
  },
};
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
let n = 0;

/** Public customer-facing chat: share this link or embed it. Conversations are stored for the owner's /admin. */
export default function PublicChat() {
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formErr, setFormErr] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const idRef = useRef("");
  const busy = useRef(false);

  const greeting = useCallback((): ChatMessage => ({ id: "greet", role: "assistant", text: fill(cfg.greeting), ts: Date.now() }), []);

  useEffect(() => {
    let id = store.get("chat_id");
    if (!id) {
      id = uid();
      store.set("chat_id", id);
    }
    idRef.current = id;
    setName(store.get("chat_name") ?? "");
    setPhone(store.get("chat_phone") ?? "");
    (async () => {
      try {
        const r = await fetch(`/api/live/chat?id=${encodeURIComponent(id!)}`).then((x) => x.json());
        if (r.messages?.length) {
          setMessages([greeting(), ...r.messages]);
          setStarted(true);
        }
      } catch {
        /* start fresh */
      }
      setReady(true);
    })();
  }, [greeting]);

  const begin = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return setFormErr("Please enter a valid 10-digit WhatsApp number");
    store.set("chat_name", name.trim());
    store.set("chat_phone", digits);
    setMessages([greeting()]);
    setStarted(true);
  };

  const send = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy.current) return;
      busy.current = true;
      setMessages((m) => [...m, { id: `c${++n}`, role: "customer", text: t, ts: Date.now() }]);
      setTyping(true);
      const t0 = Date.now();
      let reply: Partial<ChatMessage> = { text: "Sorry, I'm having trouble right now. A team member will reach out to you shortly 🙏" };
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 25000);
        const res = await fetch("/api/live/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: idRef.current, text: t, phone: store.get("chat_phone"), name: store.get("chat_name") }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const j = await res.json();
          reply = { text: j.reply, matches: j.matches, slots: j.slots };
        }
      } catch {
        /* keep the polite fallback text */
      }
      await new Promise((r) => setTimeout(r, Math.max(0, 800 - (Date.now() - t0))));
      setTyping(false);
      setMessages((m) => [...m, { id: `a${++n}`, role: "assistant", text: reply.text ?? "", ts: Date.now(), matches: reply.matches, slots: reply.slots }]);
      busy.current = false;
    },
    [],
  );

  return (
    <div className="flex h-dvh flex-col">
      <div className="mx-auto min-h-0 w-full max-w-[560px] flex-1 overflow-hidden sm:my-4 sm:rounded-2xl sm:shadow-xl sm:ring-1 sm:ring-slate-300/60">
        {!ready ? null : started ? (
          <ChatPanel messages={messages} typing={typing} draft="" mode={messages.length <= 1 ? "idle" : "live"} onSend={send} hideBadge />
        ) : (
          <div className="flex h-full flex-col bg-white">
            <div className="flex items-center gap-3 bg-brand px-4 py-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-brand-dark">{cfg.logoText}</div>
              <div>
                <div className="font-semibold leading-tight">{cfg.businessName}</div>
                <div className="text-xs text-white/80">{cfg.tagline}</div>
              </div>
            </div>
            <form onSubmit={begin} className="flex flex-1 flex-col justify-center gap-3 px-6">
              <h1 className="text-xl font-bold text-slate-900">Find your home with {cfg.assistantName}</h1>
              <p className="text-sm text-slate-500">Chat in English, Hindi or Hinglish. Our team can reach you on WhatsApp to confirm your site visit.</p>
              <label className="text-xs font-medium text-slate-600">
                Your name (optional)
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl px-4 py-2.5 text-[15px] ring-1 ring-slate-300 outline-none focus:ring-brand" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                WhatsApp number
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="98xxxxxxxx"
                  className="mt-1 w-full rounded-xl px-4 py-2.5 text-[15px] ring-1 ring-slate-300 outline-none focus:ring-brand"
                />
              </label>
              {formErr && <p className="text-sm text-red-600">{formErr}</p>}
              <button className="rounded-xl bg-brand py-3 text-[15px] font-semibold text-white hover:bg-brand-dark">Start chat</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
