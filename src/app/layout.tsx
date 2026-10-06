import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import { cfg } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `AI Property Assistant · ${cfg.businessName}`,
  description: cfg.tagline,
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: cfg.primaryColor };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ "--brand": cfg.primaryColor } as CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
