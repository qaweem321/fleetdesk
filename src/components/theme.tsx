"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Select } from "@/components/ui/input";
import { isTheme, THEME_STORAGE_KEY, type Theme, themes } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function getStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
}

// Mounted once in the root layout. Keeps the page in sync with the saved choice,
// the operating system setting (when "system"), and other open tabs.
export function ThemeSync() {
  useLayoutEffect(() => {
    const apply = () => applyTheme(getStoredTheme());
    apply();

    const media = window.matchMedia(DARK_QUERY);
    media.addEventListener("change", apply);
    window.addEventListener("storage", apply);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  return null;
}

const labels: Record<Theme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function ThemeSelect() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function handleChange(value: string) {
    if (!isTheme(value)) {
      return;
    }
    setTheme(value);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // Storage can be blocked (e.g. private mode); the choice then lasts until reload.
    }
    applyTheme(value);
  }

  return (
    <Select id="theme" value={theme} onChange={(event) => handleChange(event.target.value)}>
      {themes.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </Select>
  );
}
