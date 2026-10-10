export const themes = ["system", "light", "dark"] as const;
export type Theme = (typeof themes)[number];

export const THEME_STORAGE_KEY = "theme";

// Runs in <head> before the first paint, so dark-mode users never see a white flash.
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (themes as readonly string[]).includes(value);
}
