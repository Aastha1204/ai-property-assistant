export type Lang = "en" | "hi" | "hinglish";
export type ListingType = "sale" | "rent";
export type Loan = "pre-approved" | "needed" | "none";
export type Purpose = "self-use" | "investment";
export type LeadStatus = "New" | "Hot" | "Follow-up due" | "Closed";

export interface Lead {
  name: string | null;
  location: string | null;
  budget: number | null; // rupees (monthly rent when listingType is "rent")
  bhk: number | null;
  listingType: ListingType | null;
  purpose: Purpose | null;
  timelineMonths: number | null;
  loan: Loan | null;
  visitSlot: string | null;
}
export type Extracted = Partial<Lead>;

export type NextAction =
  | "ask_location"
  | "ask_budget"
  | "ask_bhk"
  | "ask_purpose"
  | "ask_timeline"
  | "ask_loan"
  | "show_matches"
  | "offer_slots"
  | "confirm_visit"
  | "done";

export interface Flags {
  matchesShown: boolean;
  confirmed: boolean;
  humanFollowUp: boolean;
  lang: Lang;
}

export interface Listing {
  id: string;
  title: string;
  area: string;
  bhk: number;
  type: ListingType;
  price: number;
  carpet: number;
  possession: string; // "Ready" or ISO date
  highlight: string;
}
export interface Match {
  listing: Listing;
  reason: string;
}

export interface Reason {
  key: "budget" | "timeline" | "visit" | "loan";
  label: string;
  points: number;
  max: number;
  state: "ok" | "partial" | "no";
  note: string;
}
export interface Analysis {
  score: number;
  hot: boolean;
  status: LeadStatus;
  reasons: Reason[];
  nextAction: NextAction;
  captured: number;
  total: number;
}

/** The structured JSON the dashboard renders from (one per assistant turn). */
export interface TurnJSON {
  language: Lang;
  extracted: Extracted; // fields newly captured this turn
  score: number;
  hot: boolean;
  action: NextAction; // what this reply did
  next_action: NextAction; // what happens next
  needs_human: boolean;
  source: "llm" | "fallback";
}
export interface TurnResult {
  reply: string;
  matches?: Match[];
  slots?: string[];
  lead: Lead;
  flags: Flags;
  turn: TurnJSON;
}

export interface ChatMessage {
  id: string;
  role: "customer" | "assistant";
  text: string;
  ts: number;
  matches?: Match[];
  slots?: string[];
}

export interface KbEntry {
  topic: string;
  keywords: string[];
  answer: string;
}
export interface SeedLead {
  id: string;
  name: string;
  interest: string;
  score: number;
  status: LeadStatus;
  lastActive: string;
  lang: Lang;
  followUpIn: string;
}
export interface ClientConfig {
  businessName: string;
  logoText: string;
  tagline: string;
  primaryColor: string;
  city: string;
  area: string;
  ownerName: string;
  ownerPhone: string;
  assistantName: string;
  languageMix: string[];
  demoCustomer: { phone: string };
  demoLabel: string;
  greeting: string;
  areaAliases: Record<string, string>;
  visitSlots: string[];
  summary: { timeToFirstReply: string; capturedLine: string };
  followUp: Record<Lang, string>;
  knowledgeBase: KbEntry[];
}
export interface ScriptStep {
  from: "customer" | "assistant";
  text: string;
  extracted?: Record<string, unknown>;
  showMatches?: boolean;
  confirm?: boolean;
}

export interface Session {
  id: string;
  channel: "web" | "whatsapp";
  phone?: string;
  lead: Lead;
  flags: Flags;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  lastCustomerAt: number;
  followUpSentAt?: number;
  hotNotified?: boolean;
  closed?: boolean;
}
