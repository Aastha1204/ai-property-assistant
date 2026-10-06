const trim = (s: string) => s.replace(/\.?0+$/, "");

export function inr(n: number): string {
  if (n >= 1e7) return `₹${trim((n / 1e7).toFixed(2))} Cr`;
  if (n >= 1e5) return `₹${trim((n / 1e5).toFixed(1))} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function money(n: number, type: "sale" | "rent" | null): string {
  return type === "rent" ? `${inr(n)}/mo` : inr(n);
}

export function timelineLabel(months: number): string {
  if (months <= 0) return "Immediately";
  if (months === 1) return "Within 1 month";
  if (months >= 12 && months % 12 === 0) return `Within ${months / 12} yr`;
  return `Within ${months} months`;
}

/** "Sat 11:00 AM" -> "Sat 11 AM" */
export function shortSlot(slot: string): string {
  return slot.replace(":00", "");
}

export function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
