import { LISTINGS } from "./config";
import { registerAreas } from "./engine";
import type { Listing, Session } from "./types";

/**
 * Storage: Upstash Redis (REST) when configured, else in-memory (dev only —
 * serverless instances do not share memory, so leads would be lost on Vercel).
 * Accepts the env names used by the Vercel Marketplace integration too.
 */
const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const persistent = !!(URL && TOKEN);

type Mem = { kv: Map<string, string>; sets: Map<string, Set<string>> };
const g = globalThis as unknown as { __mem?: Mem };
const mem: Mem = (g.__mem ??= { kv: new Map(), sets: new Map() });

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const j = (await res.json()) as { result?: unknown; error?: string };
  if (j.error) throw new Error(j.error);
  return j.result;
}

async function get(key: string): Promise<string | null> {
  return persistent ? ((await redis(["GET", key])) as string | null) : (mem.kv.get(key) ?? null);
}
async function set(key: string, value: string) {
  if (persistent) await redis(["SET", key, value]);
  else mem.kv.set(key, value);
}
async function sadd(key: string, member: string) {
  if (persistent) await redis(["SADD", key, member]);
  else (mem.sets.get(key) ?? mem.sets.set(key, new Set()).get(key)!).add(member);
}
async function smembers(key: string): Promise<string[]> {
  return persistent ? ((await redis(["SMEMBERS", key])) as string[]) : [...(mem.sets.get(key) ?? [])];
}
async function mget(keys: string[]): Promise<(string | null)[]> {
  if (!keys.length) return [];
  return persistent ? ((await redis(["MGET", ...keys])) as (string | null)[]) : keys.map((k) => mem.kv.get(k) ?? null);
}

/** True the first time a key is claimed (used to dedupe WhatsApp webhook retries). */
export async function claim(key: string): Promise<boolean> {
  if (persistent) return (await redis(["SET", key, "1", "NX", "EX", 86400])) === "OK";
  if (mem.kv.has(key)) return false;
  mem.kv.set(key, "1");
  return true;
}

const sKey = (id: string) => `session:${id}`;

export async function getSession(id: string): Promise<Session | null> {
  const raw = await get(sKey(id));
  return raw ? (JSON.parse(raw) as Session) : null;
}
export async function saveSession(s: Session) {
  s.messages = s.messages.slice(-80);
  await set(sKey(s.id), JSON.stringify(s));
  await sadd("sessions", s.id);
}
export async function listSessions(limit = 150): Promise<Session[]> {
  const ids = await smembers("sessions");
  const rows = (await mget(ids.map(sKey))).filter(Boolean).map((r) => JSON.parse(r as string) as Session);
  return rows.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
}
export async function deleteSession(id: string) {
  if (persistent) {
    await redis(["DEL", sKey(id)]);
    await redis(["SREM", "sessions", id]);
  } else {
    mem.kv.delete(sKey(id));
    mem.sets.get("sessions")?.delete(id);
  }
}

export async function getListings(): Promise<Listing[]> {
  let list = LISTINGS;
  try {
    const raw = await get("listings");
    if (raw) list = JSON.parse(raw) as Listing[];
  } catch {
    /* fall back to seed listings */
  }
  registerAreas(Array.from(new Set(list.map((l) => l.area))));
  return list;
}
export async function saveListings(list: Listing[]) {
  await set("listings", JSON.stringify(list));
  registerAreas(Array.from(new Set(list.map((l) => l.area))));
}
