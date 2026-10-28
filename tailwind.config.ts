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
          ink: "#14110B",
          forest: "#0F3D32",
          leaf: "#1F6B54",
          mint: "#3DBE8B",
          gold: "#C9A227",
          goldSoft: "#E8C547",
          goldDeep: "#9A7B1A",
          action: "#C9A227",
          actionDark: "#9A7B1A",
          mist: "#F3F0E4",
          fog: "#F7F4EA",
          sand: "#E4DCC8",
          warn: "#C45C26",
          danger: "#B42318",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -18px rgba(20, 17, 11, 0.28)",
        lift: "0 18px 50px -24px rgba(201, 162, 39, 0.45)",
        nav: "0 -8px 30px -16px rgba(20, 17, 11, 0.22)",
      },
      backgroundImage: {
        "hb-mesh":
          "radial-gradient(1200px 600px at 10% -10%, rgba(232,197,71,0.22), transparent 55%), radial-gradient(900px 500px at 100% 0%, rgba(31,107,84,0.18), transparent 50%), linear-gradient(180deg, #F7F4EA 0%, #F3F0E4 48%, #FAF8F2 100%)",
        "hb-banner":
          "linear-gradient(135deg, #0F3D32 0%, #1F6B54 38%, #C9A227 100%)",
        "hb-cta":
          "linear-gradient(105deg, #E8C547 0%, #C9A227 48%, #9A7B1A 100%)",
        "hb-card":
          "linear-gradient(160deg, rgba(255,255,255,0.94), rgba(247,244,234,0.9))",
        "hb-sidebar":
          "linear-gradient(180deg, #0A1F1A 0%, #0F3D32 48%, #123F35 100%)",
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
