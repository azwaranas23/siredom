import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",

        surface: {
          DEFAULT: "#171A21",
          subtle: "#1C202B",
          elevated: "#222631",
          sunken: "#0D0F12",
        },

        content: {
          DEFAULT: "#FFFFFF",
          secondary: "#94A3B8",
          muted: "#64748B",
          inverse: "#0D0F12",
        },

        brand: {
          lime: "#CCFF00",
          cyan: "#00E5FF",
        },

        win: {
          biasa: "#F59E0B",
          kandang: "#EF4444",
          ceki: "#10B981",
          palang: "#8B5CF6",
          tangkap: "#06B6D4",
        },

        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#06B6D4",

        arcade: {
          bg: "#0D0F12",
          card: "#171A21",
          border: "#2A2F3D",
          accent: "#00E5FF",
        },
        mode: {
          casual: { DEFAULT: "#00E5FF", soft: "#164E63", dim: "#0E7490" },
          pordi: { DEFAULT: "#F59E0B", soft: "#78350F", dim: "#B45309" },
          orado: { DEFAULT: "#8B5CF6", soft: "#581C87", dim: "#7E22CE" },
        },
        player: {
          1: "#FB7185",
          2: "#6366F1",
          3: "#34D399",
          4: "#FBBF24",
          red: {
            DEFAULT: "#FB7185",
            glow: "rgba(251, 113, 133, 0.4)",
            dark: "#881337",
          },
          blue: {
            DEFAULT: "#6366F1",
            glow: "rgba(99, 102, 241, 0.4)",
            dark: "#312E81",
          },
          green: {
            DEFAULT: "#34D399",
            glow: "rgba(52, 211, 153, 0.4)",
            dark: "#064E3B",
          },
          yellow: {
            DEFAULT: "#FBBF24",
            glow: "rgba(251, 191, 36, 0.4)",
            dark: "#78350F",
          },
        },
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },

      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Plus Jakarta Sans",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        display: [
          "var(--font-sans)",
          "Plus Jakarta Sans",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "Consolas",
          "monospace",
        ],
      },

      boxShadow: {
        surface: "var(--shadow-surface)",
        overlay: "var(--shadow-overlay)",
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
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-in-out",
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
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
    },
  },
  plugins: [
    // Ticket GH#17 — varian `short:` untuk viewport pendek (HP landscape)
    plugin(({ addVariant }: any) => {
      addVariant("short", "@media (max-height: 480px)");
    }),
  ],
};
export default config;
