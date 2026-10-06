"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SCRIPT, cfg, fill } from "./config";
import { EMPTY_LEAD, INITIAL_FLAGS, analyze, applyExtraction, hotAlertText } from "./engine";
import { fallbackTurn } from "./fallback";
import { topMatches } from "./matcher";
import type { ChatMessage, Flags, Lead, TurnJSON, TurnResult } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
let seq = 0;
const mid = () => `m${++seq}`;

export interface HotAlert {
  text: string;
  phone: string;
}
export type Mode = "idle" | "demo" | "live";

export function useConversation() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lead, setLeadState] = useState<Lead>(EMPTY_LEAD);
  const [flags, setFlagsState] = useState<Flags>(INITIAL_FLAGS);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [lastTurn, setLastTurn] = useState<TurnJSON | null>(null);
  const [hot, setHot] = useState<HotAlert | null>(null);

  const msgsRef = useRef<ChatMessage[]>([]);
  const leadRef = useRef<Lead>(EMPTY_LEAD);
  const flagsRef = useRef<Flags>(INITIAL_FLAGS);
  const runId = useRef(0);
  const busy = useRef(false);
  const hotFired = useRef(false);

  const push = useCallback((m: Omit<ChatMessage, "id" | "ts">) => {
    msgsRef.current = [...msgsRef.current, { ...m, id: mid(), ts: Date.now() }];
    setMessages(msgsRef.current);
  }, []);

  /** Commit lead/flags and fire the hot-lead notification the first time score hits 70. */
  const commit = useCallback((l: Lead, f: Flags) => {
    leadRef.current = l;
    flagsRef.current = f;
    setLeadState(l);
    setFlagsState(f);
    if (analyze(l, f).hot && !hotFired.current) {
      hotFired.current = true;
      setHot({ text: hotAlertText(l), phone: cfg.demoCustomer.phone });
    }
  }, []);

  const reset = useCallback(() => {
    runId.current++;
    busy.current = false;
    hotFired.current = false;
    msgsRef.current = [];
    leadRef.current = EMPTY_LEAD;
    flagsRef.current = INITIAL_FLAGS;
    setMessages([]);
    setLeadState(EMPTY_LEAD);
    setFlagsState(INITIAL_FLAGS);
    setTyping(false);
    setDraft("");
    setLastTurn(null);
    setHot(null);
    setMode("idle");
    push({ role: "assistant", text: fill(cfg.greeting) });
  }, [push]);

  useEffect(() => {
    reset();
  }, [reset]);

  /** Free typing: real LLM via /api/chat, with a local offline fallback on any failure. */
  const sendUser = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy.current) return;
      busy.current = true;
      setMode("live");
      const id = runId.current;
      push({ role: "customer", text });
      setTyping(true);
      const started = Date.now();

      const history = msgsRef.current.map((m) => ({
        role: m.role === "customer" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));
      let result: TurnResult;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ history, lead: leadRef.current, flags: flagsRef.current }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(String(res.status));
        result = (await res.json()) as TurnResult;
        if (!result?.reply || !result.lead || !result.turn) throw new Error("bad shape");
      } catch {
        result = fallbackTurn(text, leadRef.current, flagsRef.current);
      }
      await sleep(Math.max(0, 900 - (Date.now() - started)));
      if (runId.current !== id) return; // reset while waiting
      setTyping(false);
      push({ role: "assistant", text: result.reply, matches: result.matches, slots: result.slots });
      commit(result.lead, result.flags);
      setLastTurn(result.turn);
      busy.current = false;
    },
    [push, commit],
  );

  /** Scripted demo: canned replies, typing delays, zero network. */
  const playDemo = useCallback(async () => {
    reset();
    const id = runId.current;
    const alive = () => runId.current === id;
    setMode("demo");
    busy.current = true;
    await sleep(900);

    for (const step of SCRIPT) {
      if (!alive()) return;
      if (step.from === "customer") {
        for (let i = 1; i <= step.text.length; i++) {
          if (!alive()) return;
          setDraft(step.text.slice(0, i));
          await sleep(24 + Math.random() * 22);
        }
        await sleep(350);
        if (!alive()) return;
        setDraft("");
        push({ role: "customer", text: step.text });
        setTyping(true);
        await sleep(800);
        if (!alive()) return;
        if (step.extracted) {
          const ex = Object.fromEntries(
            Object.entries(step.extracted).map(([k, v]) => [k, v === "@slot0" ? cfg.visitSlots[0] : v]),
          );
          commit(applyExtraction(leadRef.current, ex).lead, flagsRef.current);
        }
      } else {
        setTyping(true);
        await sleep(Math.min(2600, Math.max(1200, 700 + step.text.length * 16)));
        if (!alive()) return;
        setTyping(false);
        const f = { ...flagsRef.current, lang: "hinglish" as const };
        const m: Omit<ChatMessage, "id" | "ts"> = { role: "assistant", text: fill(step.text) };
        if (step.showMatches) {
          m.matches = topMatches(leadRef.current);
          m.slots = cfg.visitSlots;
          f.matchesShown = true;
        }
        if (step.confirm) f.confirmed = true;
        push(m);
        commit(leadRef.current, f);
        const a = analyze(leadRef.current, f);
        setLastTurn({
          language: "hinglish",
          extracted: {},
          score: a.score,
          hot: a.hot,
          action: step.showMatches ? "show_matches" : step.confirm ? "confirm_visit" : a.nextAction,
          next_action: a.nextAction,
          needs_human: false,
          source: "fallback",
        });
      }
      await sleep(650);
    }
    if (alive()) {
      setTyping(false);
      busy.current = false;
      setMode("idle");
    }
  }, [reset, push, commit]);

  const analysis = useMemo(() => analyze(lead, flags), [lead, flags]);
  const stop = useCallback(() => reset(), [reset]);

  return {
    messages,
    lead,
    flags,
    analysis,
    typing,
    draft,
    mode,
    lastTurn,
    hot,
    finished: flags.confirmed,
    dismissHot: () => setHot(null),
    sendUser,
    playDemo,
    reset,
    stop,
  };
}
