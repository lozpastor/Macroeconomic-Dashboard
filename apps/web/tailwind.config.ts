import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        panel: "#f8fafc",
        terminal: "#172033",
        accent: "#0f766e",
        warning: "#b45309",
        signal: "#2563eb"
      },
      boxShadow: {
        terminal: "0 18px 60px rgba(15, 23, 42, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
