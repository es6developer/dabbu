import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dabbu: {
          bg: "#0A0A0F",
          surface: "#121218",
          surface2: "#1A1A24",
          border: "#2A2A35",
          accent: "#f7892c",
          "accent-hover": "#e07a1f",
          "accent-muted": "rgba(247, 137, 44, 0.15)",
          green: "#22c55e",
          "green-bg": "rgba(34, 197, 94, 0.12)",
          red: "#ef4444",
          "red-bg": "rgba(239, 68, 68, 0.12)",
          text: "#FFFFFF",
          "text-secondary": "#9CA3AF",
          "text-muted": "#6B7280",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-gradient":
          "linear-gradient(135deg, #0A0A0F 0%, #1A0A00 50%, #0A0A0F 100%)",
        "accent-gradient":
          "linear-gradient(135deg, #f7892c 0%, #ff6b35 50%, #f7892c 100%)",
        "card-gradient":
          "linear-gradient(180deg, rgba(18,18,24,0.8) 0%, rgba(10,10,15,0.95) 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "fade-in-scale": "fadeInScale 0.4s ease-out forwards",
        "shimmer": "shimmer 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(247, 137, 44, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(247, 137, 44, 0.4)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInScale: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
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
