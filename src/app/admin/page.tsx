"use client";
import { useCallback, useEffect, useState } from "react";
import LeadCard from "@/components/LeadCard";
import ScoreMeter from "@/components/ScoreMeter";
import { cfg } from "@/lib/config";
import { analyze, interestLabel, sessionStatus } from "@/lib/engine";
import { clock } from "@/lib/format";
import type { Listing, Session } from "@/lib/types";

type Tab = "leads" | "listings" | "setup";
type Status = Record<string, unknown> & { authed: boolean; adminEnabled: boolean };

const BADGE: Record<string, string> = {
  Hot: "bg-red-100 text-red-700",
  "Follow-up due": "bg-amber-100 text-amber-700",
  New: "bg-sky-100 text-sky-700",
  Closed: "bg-slate-200 text-slate-600",
};
const ago = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

export default function Admin() {
  const [status, setStatus] = useState<Status | null>(null);
  const [tab, setTab] = useState<Tab>("leads");

  const refreshStatus = useCallback(async () => setStatus(await fetch("/api/admin/status").then((r) => r.json())), []);
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  if (!status) return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  if (!status.authed) return <Login enabled={status.adminEnabled} onDone={refreshStatus} />;

  return (
    <div className="flex h-dvh flex-col bg-slate-50">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">{cfg.logoText}</div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[15px] font-bold">{cfg.businessName}</div>
          <div className="text-xs text-slate-500">Owner dashboard · {cfg.ownerName}</div>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/admin/login", { method: "DELETE" });
            refreshStatus();
          }}
          className="rounded-full px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
        >
          Log out
        </button>
      </header>
      <nav className="flex shrink-0 gap-1 border-b border-slate-200 bg-white px-3">
        {(["leads", "listings", "setup"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize ${tab === t ? "border-b-2 border-brand text-brand-dark" : "text-slate-500"}`}
          >
            {t === "leads" ? "📥 Leads" : t === "listings" ? "🏠 Listings" : "⚙️ Setup"}
          </button>
        ))}
      </nav>
      <main className="min-h-0 flex-1 overflow-y-auto">
        {tab === "leads" && <Leads />}
        {tab === "listings" && <Listings />}
        {tab === "setup" && <Setup status={status} />}
      </main>
    </div>
  );
}

function Login({ enabled, onDone }: { enabled: boolean; onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
    setBusy(false);
    if (r.ok) onDone();
    else setErr((await r.json().catch(() => ({}))).error ?? "Login failed");
  };
  return (
    <div className="flex h-dvh items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand font-bold text-white">{cfg.logoText}</div>
          <div>
            <div className="font-bold">{cfg.businessName}</div>
            <div className="text-xs text-slate-500">Owner login</div>
          </div>
        </div>
        {!enabled && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">Set the ADMIN_PASSWORD environment variable on the server to enable login.</p>}
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full rounded-xl px-4 py-2.5 ring-1 ring-slate-300 outline-none focus:ring-brand"
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={!pw || busy || !enabled} className="w-full rounded-xl bg-brand py-2.5 font-semibold text-white disabled:opacity-50">
          {busy ? "…" : "Log in"}
        </button>
      </form>
    </div>
  );
}

function Leads() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [persistent, setPersistent] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/leads");
    if (r.ok) {
      const j = await r.json();
      setSessions(j.sessions);
      setPersistent(j.persistent);
    }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  const rows = sessions.map((s) => ({ s, st: sessionStatus(s), a: analyze(s.lead, s.flags) }));
  const shown = rows.filter((r) => filter === "All" || r.st === filter);
  const cur = rows.find((r) => r.s.id === sel);
  const patch = async (id: string, body: object) => {
    await fetch(`/api/admin/leads/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    load();
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className={cur ? "hidden lg:block" : ""}>
        {!persistent && (
          <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            ⚠️ Database not connected — leads are only kept in server memory and can disappear. Connect Upstash Redis (see Setup).
          </p>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          {["All", "Hot", "Follow-up due", "New", "Closed"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? "bg-brand text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
              {f} {f !== "All" && `(${rows.filter((r) => r.st === f).length})`}
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
          {shown.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No leads yet. Share your chat link or connect WhatsApp — new conversations appear here live.</p>}
          {shown.map(({ s, st, a }) => (
            <button key={s.id} onClick={() => setSel(s.id)} className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-slate-50 ${sel === s.id ? "bg-brand-soft" : ""}`}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-dark">{s.lead.name?.[0]?.toUpperCase() ?? "?"}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-semibold">{s.lead.name ?? (s.phone ? `+${s.phone}` : "Web visitor")}</span>
                  {s.flags.humanFollowUp && <span title="Needs your follow-up">👤</span>}
                  <span className="ml-auto text-[11px] text-slate-400">{ago(s.updatedAt)}</span>
                </div>
                <div className="truncate text-xs text-slate-500">
                  {interestLabel(s.lead)} · {s.channel === "whatsapp" ? "WhatsApp" : "Website"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold tabular-nums">{a.score}</div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${BADGE[st]}`}>{st === "Hot" ? "🔥 " : ""}{st}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={cur ? "" : "hidden lg:block"}>
        {!cur ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200/70">Select a lead to see the chat, score and actions.</p>
        ) : (
          <div className="space-y-3">
            <button onClick={() => setSel(null)} className="text-sm text-slate-500 lg:hidden">← All leads</button>
            <div className="flex flex-wrap gap-2">
              {cur.s.phone && (
                <>
                  <a href={`tel:+${cur.s.phone}`} className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white">📞 Call</a>
                  <a href={`https://wa.me/${cur.s.phone}`} target="_blank" rel="noreferrer" className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white">💬 WhatsApp</a>
                </>
              )}
              {cur.s.flags.humanFollowUp && <button onClick={() => patch(cur.s.id, { clearHuman: true })} className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-800">✓ Mark follow-up done</button>}
              <button onClick={() => patch(cur.s.id, { closed: !cur.s.closed })} className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-300">{cur.s.closed ? "Reopen" : "Close lead"}</button>
              <button
                onClick={async () => {
                  if (confirm("Delete this lead and its chat permanently?")) {
                    await fetch(`/api/admin/leads/${cur.s.id}`, { method: "DELETE" });
                    setSel(null);
                    load();
                  }
                }}
                className="rounded-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
            <LeadCard lead={cur.s.lead} flags={cur.s.flags} analysis={cur.a} phone={cur.s.phone ? `+${cur.s.phone} · ${cur.s.channel === "whatsapp" ? "WhatsApp" : "Website"}` : "Website visitor"} />
            <ScoreMeter analysis={cur.a} />
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <h3 className="mb-2 text-sm font-semibold">Conversation</h3>
              <div className="chat-wallpaper scroll-thin max-h-96 space-y-1.5 overflow-y-auto rounded-xl p-3">
                {cur.s.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "customer" ? "justify-end" : ""}`}>
                    <div className={`max-w-[85%] whitespace-pre-line rounded-lg px-2.5 py-1.5 text-[13px] shadow-sm ${m.role === "customer" ? "bg-[#d9fdd3]" : "bg-white"}`}>
                      {m.text}
                      {m.matches && <div className="mt-1 text-[11px] text-slate-500">📋 Shown: {m.matches.map((x) => x.listing.title).join(", ")}</div>}
                      <div className="text-right text-[10px] text-slate-400">{clock(m.ts)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

const blank = (): Listing => ({ id: "", title: "", area: "", bhk: 2, type: "sale", price: 0, carpet: 0, possession: "Ready", highlight: "" });

function Listings() {
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    fetch("/api/admin/listings").then((r) => r.json()).then((j) => setRows(j.listings));
  }, []);
  if (!rows) return <p className="p-6 text-sm text-slate-500">Loading…</p>;

  const edit = (i: number, patch: Partial<Listing>) => {
    setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
    setDirty(true);
  };
  const save = async () => {
    const r = await fetch("/api/admin/listings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ listings: rows }) });
    const j = await r.json();
    setMsg(r.ok ? { ok: true, text: `Saved ${j.count} listings. The assistant uses them immediately.` } : { ok: false, text: j.error });
    if (r.ok) setDirty(false);
  };
  const cell = "w-full rounded-lg px-2 py-1.5 text-[13px] ring-1 ring-slate-200 outline-none focus:ring-brand";

  return (
    <div className="mx-auto max-w-6xl p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Listings ({rows.length})</h2>
        <button onClick={() => { setRows([...rows, blank()]); setDirty(true); }} className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold ring-1 ring-slate-300">+ Add listing</button>
        <button onClick={save} disabled={!dirty} className="rounded-full bg-brand px-5 py-1.5 text-sm font-semibold text-white disabled:opacity-40">Save changes</button>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
      </div>
      <p className="mb-3 text-xs text-slate-500">Price is in rupees (rent = per month). Possession: &quot;Ready&quot; or a date like 2027-03-31. The assistant recommends from this list only.</p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 sm:grid-cols-6">
            <input className={`${cell} col-span-2`} placeholder="Title" value={r.title} onChange={(e) => edit(i, { title: e.target.value })} />
            <input className={cell} placeholder="Area" value={r.area} onChange={(e) => edit(i, { area: e.target.value })} />
            <select className={cell} value={r.type} onChange={(e) => edit(i, { type: e.target.value as Listing["type"] })}>
              <option value="sale">Sale</option>
              <option value="rent">Rent</option>
            </select>
            <input className={cell} type="number" min={1} max={6} placeholder="BHK" value={r.bhk} onChange={(e) => edit(i, { bhk: Number(e.target.value) })} />
            <input className={cell} type="number" placeholder="Carpet sq ft" value={r.carpet || ""} onChange={(e) => edit(i, { carpet: Number(e.target.value) })} />
            <input className={cell} type="number" placeholder="Price ₹" value={r.price || ""} onChange={(e) => edit(i, { price: Number(e.target.value) })} />
            <input className={cell} placeholder="Ready / 2027-03-31" value={r.possession} onChange={(e) => edit(i, { possession: e.target.value })} />
            <input className={`${cell} col-span-2 sm:col-span-3`} placeholder="One-line highlight" value={r.highlight} onChange={(e) => edit(i, { highlight: e.target.value })} />
            <button onClick={() => { setRows(rows.filter((_, k) => k !== i)); setDirty(true); }} className="rounded-lg px-2 text-sm text-red-600 hover:bg-red-50">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Setup({ status }: { status: Status }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const rows: [string, boolean, string][] = [
    ["AI model (LLM_API_KEY)", !!status.llm, "Without it the assistant still works using the built-in rule-based replies."],
    ["Database (Upstash Redis)", !!status.database, "Required on Vercel so leads and edited listings survive."],
    ["WhatsApp connected", !!status.whatsapp, "WA_ACCESS_TOKEN + WA_PHONE_NUMBER_ID from Meta."],
    ["Webhook signature check (WA_APP_SECRET)", !!status.whatsappSecurity, "Rejects fake webhook calls. Should be ON in production."],
    ["Owner hot-lead alerts (OWNER_WA_NUMBER)", !!status.ownerAlerts, "WhatsApp message to the owner when a lead turns HOT."],
    ["24 h follow-up template (WA_FOLLOWUP_TEMPLATE)", !!status.followUpTemplate && !!status.cron, "Needs WA_FOLLOWUP_TEMPLATE and CRON_SECRET."],
  ];
  const Copy = ({ v }: { v: string }) => <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 text-[12px]">{v}</code>;
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-5">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <h3 className="mb-2 font-semibold">Links</h3>
        <ul className="space-y-1.5 text-sm">
          <li>Customer chat (share / embed): <Copy v={`${origin}/chat`} /></li>
          <li>Sales demo: <Copy v={`${origin}/`} /></li>
          <li>WhatsApp webhook URL (paste in Meta): <Copy v={`${origin}/api/whatsapp`} /></li>
        </ul>
      </section>
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <h3 className="mb-2 font-semibold">Integration status</h3>
        <ul className="divide-y divide-slate-100">
          {rows.map(([label, ok, hint]) => (
            <li key={label} className="flex items-start gap-3 py-2 text-sm">
              <span className={`mt-0.5 ${ok ? "text-emerald-600" : "text-slate-300"}`}>{ok ? "●" : "○"}</span>
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-xs text-slate-500">{hint}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-slate-500">Business name, colour, owner, knowledge base and visit slots are edited in <code>config/client.json</code> and redeployed.</p>
    </div>
  );
}
