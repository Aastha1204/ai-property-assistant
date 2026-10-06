import clientJson from "../../config/client.json";
import propertiesJson from "../../data/properties.json";
import leadsJson from "../../data/leads.json";
import scriptJson from "../../data/demo-script.json";
import type { ClientConfig, Listing, ScriptStep, SeedLead } from "./types";

export const cfg = clientJson as unknown as ClientConfig;
export const LISTINGS = propertiesJson as Listing[];
export const SEED_LEADS = leadsJson as SeedLead[];
export const SCRIPT = scriptJson as unknown as ScriptStep[];

/** Areas the business serves, derived from the listings (in file order). */
export const AREAS = Array.from(new Set(LISTINGS.map((l) => l.area)));

/** Replace {{tokens}} so no brand name is ever hardcoded in copy. */
export function fill(text: string, extra: Record<string, string> = {}): string {
  const vars: Record<string, string> = {
    business: cfg.businessName,
    owner: cfg.ownerName,
    area: cfg.area,
    city: cfg.city,
    assistant: cfg.assistantName,
    slot0: cfg.visitSlots[0],
    ...extra,
  };
  return text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m);
}
