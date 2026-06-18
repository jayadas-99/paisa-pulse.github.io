/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Sora", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
      },
      colors: {
        paisa: {
          bg: "#0a0a0f",
          card: "#12121a",
          hover: "#1a1a24",
          border: "#1e1e2e",
          accent: "#7c3aed",
          accentLight: "#a78bfa",
          text: "#e0e0f0",
          muted: "#8b8ba3",
        },
      },
    },
  },
  plugins: [],
};
