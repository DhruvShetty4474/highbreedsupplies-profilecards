import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hb: {
          /* Neutrals — warm ivory so gold reads clean */
          ink: "#1A160F",
          mist: "#FFF8E7",
          fog: "#FFFBF3",
          sand: "#EDE0C4",
          /* Primary — yellow gold */
          gold: "#D4A017",
          goldSoft: "#F0C94A",
          goldDeep: "#A67C00",
          action: "#D4A017",
          actionDark: "#A67C00",
          /* Secondary — emerald green */
          forest: "#0B5C45",
          leaf: "#147A5A",
          mint: "#2FA87A",
          warn: "#C45C26",
          danger: "#B42318",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -18px rgba(26, 22, 15, 0.22)",
        lift: "0 18px 48px -20px rgba(212, 160, 23, 0.42)",
        nav: "0 -8px 30px -16px rgba(26, 22, 15, 0.2)",
      },
      backgroundImage: {
        "hb-mesh":
          "radial-gradient(1100px 560px at 8% -12%, rgba(240,201,74,0.28), transparent 52%), radial-gradient(900px 480px at 100% 0%, rgba(11,92,69,0.12), transparent 48%), linear-gradient(180deg, #FFFBF3 0%, #FFF8E7 52%, #FFFAF0 100%)",
        "hb-banner":
          "linear-gradient(135deg, #0B5C45 0%, #147A5A 40%, #D4A017 100%)",
        "hb-cta":
          "linear-gradient(110deg, #F0C94A 0%, #D4A017 45%, #A67C00 100%)",
        "hb-card":
          "linear-gradient(160deg, rgba(255,255,255,0.96), rgba(255,248,231,0.92))",
        "hb-sidebar":
          "linear-gradient(180deg, #062E24 0%, #0B5C45 55%, #0A4A38 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s ease-out both",
        shimmer: "shimmer 2.2s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
