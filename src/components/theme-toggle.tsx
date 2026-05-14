"use client";

import { useCallback, useEffect, useState } from "react";
import { readStoredTheme, writeStoredTheme, type AppColorScheme } from "@/components/theme-sync";

export function ThemeToggle() {
  const [theme, setTheme] = useState<AppColorScheme>("dark");

  useEffect(() => {
    const t = (document.documentElement.dataset.theme as AppColorScheme) || readStoredTheme() || "dark";
    setTheme(t === "light" ? "light" : "dark");
  }, []);

  const toggle = useCallback(() => {
    const next: AppColorScheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    writeStoredTheme(next);
  }, [theme]);

  return (
    <button
      type="button"
      className="app-icon-btn"
      onClick={toggle}
      aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
      title={theme === "dark" ? "Tema claro" : "Tema oscuro"}
    >
      <span className="material-symbols-outlined" aria-hidden>
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
