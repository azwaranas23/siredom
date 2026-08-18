import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        arcade: {
          bg: "#030712",
          card: "#0b0f19",
          border: "#1f293d",
          accent: "#00f0ff",
        },
        player: {
          red: {
            DEFAULT: "#ef4444",
            glow: "rgba(239, 68, 68, 0.4)",
            dark: "#7f1d1d",
          },
          blue: {
            DEFAULT: "#3b82f6",
            glow: "rgba(59, 130, 246, 0.4)",
            dark: "#1e3a8a",
          },
          green: {
            DEFAULT: "#10b981",
            glow: "rgba(16, 185, 129, 0.4)",
            dark: "#064e3b",
          },
          yellow: {
            DEFAULT: "#eab308",
            glow: "rgba(234, 179, 8, 0.4)",
            dark: "#713f12",
          },
        },
      },
      fontFamily: {
        display: ["system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        mono: ["Consolas", "Monaco", "monospace"],
      },

      boxShadow: {
        neonRed: "0 0 25px rgba(239, 68, 68, 0.5)",
        neonBlue: "0 0 25px rgba(59, 130, 246, 0.5)",
        neonGreen: "0 0 25px rgba(16, 185, 129, 0.5)",
        neonYellow: "0 0 25px rgba(234, 179, 8, 0.5)",
        neonGold: "0 0 35px rgba(255, 215, 0, 0.7)",
        arcade: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      animation: {
        pulseGlow: "pulseGlow 2s infinite ease-in-out",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 2.5s infinite linear",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", filter: "brightness(1.2)" },
          "50%": { opacity: "0.7", filter: "brightness(0.9)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
