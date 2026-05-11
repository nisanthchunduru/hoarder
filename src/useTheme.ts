import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "system");

  useEffect(() => {
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem("theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  const cycle = () => setTheme(t => t === "system" ? "light" : t === "light" ? "dark" : "system");

  return { theme, cycle };
}
