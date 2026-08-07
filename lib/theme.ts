export type ThemeMode = "dark" | "light";

export const THEME_KEY = "anime_nexus_theme";
export const VIEW_MODE_KEY = "anime_nexus_view_mode";

export type ViewMode = "grid" | "poster" | "shelf";

export function readTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function writeTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  if (mode === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function readViewMode(): ViewMode {
  if (typeof window === "undefined") return "grid";
  try {
    const v = localStorage.getItem(VIEW_MODE_KEY);
    if (v === "grid" || v === "poster" || v === "shelf") return v;
    if (localStorage.getItem("anime_nexus_poster_wall") === "1") return "poster";
  } catch {
    /* ignore */
  }
  return "grid";
}

export function writeViewMode(mode: ViewMode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}
