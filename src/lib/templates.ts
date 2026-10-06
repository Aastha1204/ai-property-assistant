import { cfg, fill } from "./config";
import { getAreas } from "./engine";
import { inr, timelineLabel } from "./format";
import type { Extracted, Lang, Lead, NextAction } from "./types";

type T = Record<Lang, string>;

const T: Record<string, T> = {
  ask_location: {
    en: "Which area are you looking in? We cover {areas} 📍",
    hinglish: "Kis area mein dekh rahe ho? Hum {areas} mein kaam karte hain 📍",
    hi: "आप किस इलाके में देख रहे हैं? हम {areas} में काम करते हैं 📍",
  },
  ask_budget: {
    en: "What's your budget? (e.g. 1.2 Cr or 85 lakh) 💰",
    hinglish: "Aapka budget kitna hai? (jaise 1.2 cr ya 85 lakh) 💰",
    hi: "आपका बजट कितना है? (जैसे 1.2 करोड़ या 85 लाख) 💰",
  },
  ask_budget_rent: {
    en: "What's your monthly rent budget? (e.g. 35k) 💰",
    hinglish: "Monthly rent ka budget kitna hai? (jaise 35k) 💰",
    hi: "मासिक किराए का बजट कितना है? (जैसे 35 हज़ार) 💰",
  },
  ask_bhk: {
    en: "How many BHK do you need — 1, 2 or 3?",
    hinglish: "Kitne BHK chahiye — 1, 2 ya 3?",
    hi: "कितने BHK चाहिए — 1, 2 या 3?",
  },
  ask_purpose: {
    en: "Is this for self-use or investment?",
    hinglish: "Ye self-use ke liye hai ya investment ke liye?",
    hi: "यह खुद रहने के लिए है या निवेश के लिए?",
  },
  ask_timeline: {
    en: "When do you need possession? (e.g. within 2 months)",
    hinglish: "Possession kab tak chahiye? (jaise 2 mahine mein)",
    hi: "पज़ेशन कब तक चाहिए? (जैसे 2 महीने में)",
  },
  ask_loan: {
    en: "Will you need a home loan? Is it pre-approved, or are you paying cash?",
    hinglish: "Home loan chahiye? Pre-approved hai ya cash payment?",
    hi: "क्या होम लोन चाहिए? प्री-अप्रूव्ड है या कैश पेमेंट?",
  },
  show_matches: {
    en: "Here are your top matches 👇 Pick a slot for a free site visit:",
    hinglish: "Ye rahe aapke top options 👇 Free site visit ke liye slot chuniye:",
    hi: "ये रहे आपके टॉप विकल्प 👇 फ्री साइट विज़िट के लिए स्लॉट चुनें:",
  },
  offer_slots: {
    en: "Which slot works for a free site visit?",
    hinglish: "Site visit ke liye kaun sa slot theek rahega?",
    hi: "साइट विज़िट के लिए कौन सा स्लॉट ठीक रहेगा?",
  },
  confirm_visit: {
    en: "Done ✅ Site visit confirmed for {slot}. {{owner}} will show you around personally. We'll WhatsApp the location 🙌",
    hinglish: "Done ✅ {slot} ko site visit confirm. {{owner}} khud aapko property dikhayenge. Location WhatsApp pe bhej denge 🙌",
    hi: "हो गया ✅ {slot} को साइट विज़िट कन्फर्म। {{owner}} खुद आपको प्रॉपर्टी दिखाएँगे। लोकेशन WhatsApp पर भेज देंगे 🙌",
  },
  done: {
    en: "Anything else I can help with? 😊",
    hinglish: "Aur kuch madad chahiye to bataiye 😊",
    hi: "और कुछ मदद चाहिए तो बताइए 😊",
  },
  human: {
    en: "A team member will confirm that for you shortly 🙏",
    hinglish: "Iske baare mein hamari team ka member aapko jaldi confirm karega 🙏",
    hi: "इसकी पुष्टि हमारी टीम का सदस्य जल्द ही करेगा 🙏",
  },
  noted: { en: "Noted:", hinglish: "Noted:", hi: "नोट किया:" },
  hello: { en: "Hello {name}! 😊", hinglish: "Namaste {name}! 😊", hi: "नमस्ते {name}! 😊" },
};

function ack(lang: Lang, changed: Extracted): string {
  const bits: string[] = [];
  if (changed.bhk) bits.push(`${changed.bhk}BHK`);
  if (changed.location) bits.push(changed.location);
  if (changed.budget) bits.push(inr(changed.budget));
  if (changed.purpose) bits.push(changed.purpose);
  if (changed.timelineMonths != null) bits.push(timelineLabel(changed.timelineMonths).toLowerCase());
  if (changed.loan) bits.push(changed.loan === "pre-approved" ? "loan pre-approved" : changed.loan === "none" ? "cash" : "loan needed");
  return bits.length ? `${T.noted[lang]} ${bits.slice(0, 3).join(", ")} 👍` : "";
}

export function buildReply(opts: {
  action: NextAction;
  lang: Lang;
  lead: Lead;
  changed: Extracted;
  kbAnswer?: string | null;
  needsHuman?: boolean;
  firstName?: boolean;
}): string {
  const { action, lang, lead, changed, kbAnswer, needsHuman, firstName } = opts;
  const key = action === "ask_budget" && lead.listingType === "rent" ? "ask_budget_rent" : action;
  const main = fill(T[key][lang].replace("{areas}", getAreas().join(", ")).replace("{slot}", lead.visitSlot ?? ""));
  const lines: string[] = [];
  if (firstName && lead.name) lines.push(T.hello[lang].replace("{name}", lead.name));
  if (action !== "confirm_visit") {
    const a = ack(lang, changed);
    if (a) lines.push(a);
  }
  if (kbAnswer) lines.push(kbAnswer);
  else if (needsHuman) lines.push(T.human[lang]);
  lines.push(main);
  return lines.join("\n");
}

