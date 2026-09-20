import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc7fc",
          400: "#36aaf7",
          500: "#0c8ee9",
          600: "#0270c7",
          700: "#0359a1",
          800: "#074b85",
          900: "#0c3f6e",
          950: "#082849",
        },
        navy: {
          800: "#111827",
          900: "#0B132B",
          950: "#070C1E",
        },
        gold: {
          400: "#F3C969",
          500: "#D4AF37",
          600: "#AA820A",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
