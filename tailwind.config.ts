import type { Config } from "tailwindcss";

/** Token color that also supports Tailwind opacity modifiers (bg-royal/10) via color-mix. */
const token = (name: string) => ({ opacityValue }: { opacityValue?: string }) =>
  opacityValue === undefined || opacityValue === "1"
    ? `var(--${name})`
    : `color-mix(in srgb, var(--${name}) calc(${opacityValue} * 100%), transparent)`;

const NAMES = ["bg", "surface", "surface-2", "line", "line-strong", "text", "text-2", "text-3", "royal", "fact", "hyp", "unknown", "conflict"];

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(NAMES.map((n) => [n, token(n)])),
        "royal-soft": "var(--royal-soft)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["11px", "1.4"],
        sm: ["12px", "1.45"],
        base: ["13px", "1.45"],
        md: ["15px", "1.4"],
      },
      borderRadius: { DEFAULT: "6px", sm: "4px", md: "8px" },
    },
  },
  plugins: [],
};

export default config;
