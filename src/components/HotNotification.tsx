import { cfg } from "@/lib/config";
import type { HotAlert } from "@/lib/useConversation";

/** iOS-style lock-screen banner shown to the owner the moment a lead turns HOT. */
export default function HotNotification({ alert, onDismiss }: { alert: HotAlert; onDismiss: () => void }) {
  return (
    <div className="slide-down rounded-3xl bg-slate-900/95 p-3 text-white shadow-xl ring-1 ring-white/10">
      <div className="flex items-start gap-3">
        <div className="ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-xs font-bold">{cfg.logoText}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-white/60">
            <span>{cfg.businessName}</span>
            <span>now</span>
          </div>
          <p className="mt-0.5 text-[14px] font-semibold leading-snug">{alert.text}</p>
          <div className="mt-2.5 flex gap-2">
            <a
              href={`tel:${alert.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-emerald-400"
            >
              📞 Call
            </a>
            <button onClick={onDismiss} className="rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-medium hover:bg-white/20">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
