import { LISTINGS } from "./config";
import { inr } from "./format";
import type { Lead, Listing, Match } from "./types";

const MONTH_MS = 30.4 * 86400000;

function monthsUntil(l: Listing): number {
  if (l.possession === "Ready") return 0;
  const t = Date.parse(l.possession);
  return Number.isNaN(t) ? 0 : Math.max(0, (t - Date.now()) / MONTH_MS);
}

export function possessionLabel(l: Listing): string {
  if (monthsUntil(l) <= 0) return "Ready to move";
  return `Possession ${new Date(l.possession).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
}

function reasonFor(l: Listing, lead: Lead): string {
  const parts: string[] = [];
  parts.push(lead.location && l.area === lead.location ? `In ${l.area}` : `Nearby in ${l.area}`);
  if (lead.bhk) parts.push(l.bhk === lead.bhk ? `${l.bhk}BHK as you wanted` : `${l.bhk}BHK (you asked ${lead.bhk}BHK)`);
  if (lead.budget) {
    const unit = l.type === "rent" ? "/mo" : "";
    if (l.price === lead.budget) parts.push("right at your budget");
    else if (l.price < lead.budget) parts.push(`${inr(lead.budget - l.price)}${unit} under budget`);
    else parts.push(`${inr(l.price - lead.budget)}${unit} above budget`);
  }
  const p = possessionLabel(l);
  parts.push(p.charAt(0).toLowerCase() + p.slice(1));
  return parts.join(" · ");
}

/** Top matches from the seed listings, ranked by location, BHK, budget and possession fit. */
export function topMatches(lead: Lead, n = 3, listings: Listing[] = LISTINGS): Match[] {
  const type = lead.listingType ?? "sale";
  return listings.filter((l) => l.type === type)
    .map((l) => {
      let s = 0;
      if (lead.location && l.area === lead.location) s += 40;
      if (lead.bhk) {
        const d = Math.abs(l.bhk - lead.bhk);
        s += d === 0 ? 30 : d === 1 ? 10 : 0;
      }
      if (lead.budget) {
        if (l.price <= lead.budget) s += 25;
        else if (l.price <= lead.budget * 1.1) s += 10;
        s -= (Math.abs(l.price - lead.budget) / lead.budget) * 5;
      }
      if (lead.timelineMonths != null && monthsUntil(l) <= lead.timelineMonths + 1) s += 5;
      return { listing: l, s };
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map(({ listing }) => ({ listing, reason: reasonFor(listing, lead) }));
}
