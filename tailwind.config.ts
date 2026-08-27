import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        navy: "#183B5B",
        "navy-soft": "#EAF0F5",
        paper: "#F7F8FA",
        line: "#DDE2E8",
        orange: "#C86B2A",
        "orange-soft": "#FBF1E9",
        green: "#286356",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23, 32, 51, 0.04), 0 8px 24px rgba(23, 32, 51, 0.04)",
      },
      fontFamily: {
        sans: ["Arial", "PingFang SC", "Microsoft YaHei", "sans-serif"],
        display: ["Arial Narrow", "DIN Condensed", "PingFang SC", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
