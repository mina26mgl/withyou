import type { Config } from "tailwindcss";
import withyouBaseConfig from "@withyou/ui-config";

const config: Config = {
  presets: [withyouBaseConfig as Config],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#FAF5FF",
          100: "#F3E8FF",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          900: "#4C1D95",
        },
        secondary: {
          50: "#FFF0F5",
          100: "#FFE4EF",
          500: "#EC4899",
          600: "#DB2777",
        },
        withyou: {
          bg: "#FAFFFB",
          card: "#FFFFFF",
          text: "#1A1A1A",
          muted: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        playfair: ['"Playfair Display"', "Georgia", "serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
