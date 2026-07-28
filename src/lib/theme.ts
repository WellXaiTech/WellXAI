export type Theme = "light" | "dark" | "system";

const THEME_KEY = "chatgiza:theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(THEME_KEY);
  return raw === "light" || raw === "dark" ? raw : "system";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function setTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}
