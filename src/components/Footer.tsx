import { cfg } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white/80 py-1.5 text-center text-[11px] text-slate-400">
      {cfg.demoLabel} · AI Property Assistant for {cfg.businessName}
    </footer>
  );
}
