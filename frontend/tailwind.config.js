/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // From DESIGN.md tokens
        primary: { DEFAULT: "#994700", hover: "#7a3800" },
        accent: "#E87722",
        navy: "#3d5ca2",
        surface: "#f6f9ff",
        "surface-container": "#e8eef7",
        ink: "#151c22",
        muted: "#564337",
        outline: "#DEE2E6",
        success: "#1f7a3a",
        error: "#ba1a1a",
      },
      fontFamily: {
        sans: ['"Public Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "1rem",
      },
      maxWidth: {
        page: "1280px",
      },
    },
  },
  plugins: [],
};