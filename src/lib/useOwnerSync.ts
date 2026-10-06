"use client";
import { useEffect, useRef, useState } from "react";
import { SYNC_KEY, type SyncState } from "./useConversation";

/**
 * Owner page: mirrors the customer chat. Same browser -> localStorage (instant);
 * other device -> server room code. Whichever snapshot is newer wins.
 */
export function useOwnerSync(room: string | null): SyncState | null {
  const [state, setState] = useState<SyncState | null>(null);
  const last = useRef("");

  useEffect(() => {
    const apply = (s: SyncState | null) => {
      const key = s ? `${s.ts}` : "";
      if (key === last.current) return;
      last.current = key;
      setState(s);
    };
    const local = (): SyncState | null => {
      try {
        const raw = localStorage.getItem(SYNC_KEY);
        return raw ? (JSON.parse(raw) as SyncState) : null;
      } catch {
        return null;
      }
    };
    let remote: SyncState | null = null;
    const merge = () => {
      const l = local();
      apply(l && (!remote || l.ts >= remote.ts) ? l : remote);
    };
    const pull = async () => {
      if (!room) return;
      try {
        const j = await fetch(`/api/demo-sync?room=${room}`, { cache: "no-store" }).then((r) => r.json());
        remote = (j.state as SyncState | null) ?? null;
      } catch {
        /* offline: keep last */
      }
      merge();
    };
    merge();
    pull();
    const onStorage = (e: StorageEvent) => (e.key === SYNC_KEY || e.key === null) && merge();
    window.addEventListener("storage", onStorage);
    const t = setInterval(() => (room ? pull() : merge()), 1500);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(t);
    };
  }, [room]);

  return state;
}
