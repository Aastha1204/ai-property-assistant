"use client";
import { useEffect, useRef, useState } from "react";
import type { Analysis } from "@/lib/types";

function useAnimated(target: number) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 800);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

const R = 80;
const LEN = Math.PI * R;
const point = (score: number, r: number) => {
  const th = (Math.PI * score) / 100;
  return { x: 100 - r * Math.cos(th), y: 100 - r * Math.sin(th) };
};

const ICON = { ok: "✓", partial: "◐", no: "○" } as const;
const TONE = { ok: "text-emerald-600", partial: "text-amber-500", no: "text-slate-300" } as const;

export default function ScoreMeter({ analysis }: { analysis: Analysis }) {
  const shown = useAnimated(analysis.score);
  const color = analysis.hot ? "#ef4444" : analysis.score >= 40 ? "#f59e0b" : "#94a3b8";
  const a = point(70, 70);
  const b = point(70, 92);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Lead score</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            analysis.hot ? "pulse-ring bg-red-500 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {analysis.hot ? "🔥 HOT" : "Warming up"}
        </span>
      </div>

      <div className="relative mx-auto mt-1 w-full max-w-[260px]">
        <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={`Lead score ${analysis.score} out of 100`}>
          <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round" />
          <path
            d="M20 100 A80 80 0 0 1 180 100"
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${(LEN * analysis.score) / 100} ${LEN}`}
            style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.2,.8,.2,1), stroke 0.4s" }}
          />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#0f172a" strokeWidth="2" />
          <text x={b.x + 3} y={b.y - 3} fontSize="8" fill="#475569" fontWeight="600">
            70
          </text>
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <div className="text-4xl font-extrabold leading-none text-slate-900">{shown}</div>
          <div className="text-[11px] text-slate-400">out of 100</div>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {analysis.reasons.map((r) => (
          <li key={r.key} className="flex items-start gap-2 text-[13px]">
            <span className={`mt-px w-4 text-center font-bold ${TONE[r.state]}`}>{ICON[r.state]}</span>
            <span className="flex-1 text-slate-700">
              <span className="font-medium">{r.label}:</span> <span className="text-slate-500">{r.note}</span>
            </span>
            <span className={`tabular-nums text-xs font-semibold ${r.points ? "text-slate-700" : "text-slate-300"}`}>
              +{r.points}/{r.max}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
