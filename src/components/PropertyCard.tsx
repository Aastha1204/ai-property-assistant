import { money } from "@/lib/format";
import { possessionLabel } from "@/lib/matcher";
import type { Match } from "@/lib/types";

export default function PropertyCard({ match, rank }: { match: Match; rank: number }) {
  const l = match.listing;
  return (
    <div className="pop-in overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm" style={{ animationDelay: `${rank * 120}ms` }}>
      <div className="flex items-center justify-between bg-brand-soft px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark">
          #{rank + 1} · {l.area}
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {l.type === "rent" ? "For rent" : "For sale"}
        </span>
      </div>
      <div className="px-3 pb-3 pt-2">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="truncate text-[15px] font-semibold text-slate-900">{l.title}</h4>
          <span className="shrink-0 text-[15px] font-bold text-brand-dark">{money(l.price, l.type)}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {l.bhk} BHK · {l.carpet} sq ft carpet · {possessionLabel(l)}
        </p>
        <p className="mt-1.5 text-[13px] text-slate-700">{l.highlight}</p>
        <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-[12px] leading-snug text-emerald-800">
          ✓ {match.reason}
        </p>
      </div>
    </div>
  );
}
