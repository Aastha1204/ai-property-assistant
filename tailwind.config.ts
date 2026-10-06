import type { Config } from "tailwindcss";

// Brand colors come from CSS variables set in layout.tsx from /config/client.json.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "var(--brand)",
        "brand-soft": "var(--brand-soft)",
        "brand-dark": "var(--brand-dark)",
      },
    },
  },
  plugins: [],
};
export default config;
