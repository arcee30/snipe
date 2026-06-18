import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#151515",
        steel: "#5f6f80",
        coin: "#c99a2e",
        asphalt: "#20272f"
      }
    }
  },
  plugins: []
};

export default config;
