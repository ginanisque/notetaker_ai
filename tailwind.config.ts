import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141414",
        paper: "#f7f5ef",
        line: "#ded8cb",
        accent: "#256f63",
        gold: "#b9822f"
      }
    }
  },
  plugins: []
};

export default config;
