import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1E2A4A", soft: "#4A5573", faint: "#8A93A8" },
        paper: "#F4F6FA",
        line: "#DFE3EC",
        marker: { DEFAULT: "#FFD84D", soft: "#FFF3C4" },
        ok: { DEFAULT: "#178A5E", soft: "#E3F4EC" },
        mid: { DEFAULT: "#2C6FB7", soft: "#E4EEF9" },
        warn: { DEFAULT: "#B7791F", soft: "#FBF0DC" },
        bad: { DEFAULT: "#C93C3C", soft: "#FBE6E6" },
        absent: { DEFAULT: "#6B7489", soft: "#ECEEF3" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        lift: "0 1px 0 #DFE3EC, 0 8px 24px -12px rgba(30,42,74,.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
