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
          bg: "var(--bg-primary)",
          card: "var(--bg-card)",
          hover: "var(--bg-hover)",
          border: "var(--border)",
          border2: "var(--border2)",
          accent: "var(--accent)",
          accentLight: "var(--accent-light)",
          text: "var(--text-primary)",
          muted: "var(--text-secondary)",
          tag: "var(--tag-bg)",
        },
      },
    },
  },
  plugins: [],
};
