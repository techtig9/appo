import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        violet: {
          DEFAULT: "#8B5CF6",
          deep: "#4C1D95",
        },
        fuchsia: {
          DEFAULT: "#D946EF",
        },
        cyan: {
          DEFAULT: "#22D3EE",
        },
        surface: {
          DEFAULT: "#0B0B14",
          elevated: "#13131F",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(160deg, #0B0B14 0%, #13131F 60%, #1A1230 100%)",
        "accent-gradient": "linear-gradient(100deg, #8B5CF6, #D946EF 45%, #22D3EE)",
      },
      borderRadius: {
        card: "24px",
      },
      backdropBlur: {
        glass: "18px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.4)",
        "glass-hover": "0 0 0 1px rgba(139,92,246,0.15), 0 20px 60px rgba(139,92,246,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
