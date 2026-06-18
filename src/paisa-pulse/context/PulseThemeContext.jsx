import { createContext, useContext, useEffect, useMemo, useState } from "react";

const PulseThemeContext = createContext(null);

export function PulseThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("paisa-pulse-theme") || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("paisa-pulse-theme", theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme((current) => current === "dark" ? "light" : "dark"),
  }), [theme]);

  return <PulseThemeContext.Provider value={value}>{children}</PulseThemeContext.Provider>;
}

export function usePulseTheme() {
  return useContext(PulseThemeContext);
}
