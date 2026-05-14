"use client";

import { useEffect } from "react";

const STORAGE_KEY = "luxe-nav-theme";

export type AppColorScheme = "dark" | "light";

export function readStoredTheme(): AppColorScheme | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" ? v : null;
}

export function writeStoredTheme(theme: AppColorScheme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

/** Aplica `data-theme` en `<html>` según localStorage o preferencia del sistema. */
export function ThemeSync() {
  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) {
      document.documentElement.dataset.theme = stored;
      document.documentElement.style.colorScheme = stored;
      return;
    }
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const initial: AppColorScheme = prefersLight ? "light" : "dark";
    document.documentElement.dataset.theme = initial;
    document.documentElement.style.colorScheme = initial;
  }, []);
  return null;
}
