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
          ink: "#071512",
          forest: "#0F3D32",
          leaf: "#1F6B54",
          mint: "#3DBE8B",
          action: "#0E7C66",
          actionDark: "#0A5C4C",
          mist: "#E8F2EE",
          fog: "#F3F8F6",
          sand: "#D7E5DF",
          warn: "#C45C26",
          danger: "#B42318",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -18px rgba(7, 21, 18, 0.35)",
        lift: "0 18px 50px -24px rgba(14, 124, 102, 0.45)",
        nav: "0 -8px 30px -16px rgba(7, 21, 18, 0.25)",
      },
      backgroundImage: {
        "hb-mesh":
          "radial-gradient(1200px 600px at 10% -10%, rgba(61,190,139,0.28), transparent 55%), radial-gradient(900px 500px at 100% 0%, rgba(14,124,102,0.22), transparent 50%), linear-gradient(180deg, #F3F8F6 0%, #E8F2EE 48%, #F7FBFA 100%)",
        "hb-banner":
          "linear-gradient(135deg, #0F3D32 0%, #1F6B54 42%, #3DBE8B 100%)",
        "hb-cta":
          "linear-gradient(105deg, #0E7C66 0%, #1F6B54 55%, #0A5C4C 100%)",
        "hb-card":
          "linear-gradient(160deg, rgba(255,255,255,0.92), rgba(243,248,246,0.88))",
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
