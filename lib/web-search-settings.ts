/** Browser-side BYOK configuration for live web search. Keys are never bundled into the repository. */

export const WEB_SEARCH_SETTINGS_KEY = "anime_nexus_web_search_settings";

export type WebSearchProvider = "auto" | "gemini" | "tavily" | "serper";

export type WebSearchSettings = {
  provider: WebSearchProvider;
  geminiKey: string;
  tavilyKey: string;
  serperKey: string;
};

export const DEFAULT_WEB_SEARCH_SETTINGS: WebSearchSettings = {
  provider: "auto",
  geminiKey: "",
  tavilyKey: "",
  serperKey: "",
};

export function readWebSearchSettings(): WebSearchSettings {
  if (typeof window === "undefined") return { ...DEFAULT_WEB_SEARCH_SETTINGS };
  try {
    const raw = localStorage.getItem(WEB_SEARCH_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_WEB_SEARCH_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<WebSearchSettings>;
    const provider = parsed.provider;
    return {
      provider:
        provider === "gemini" || provider === "tavily" || provider === "serper"
          ? provider
          : "auto",
      geminiKey: String(parsed.geminiKey || ""),
      tavilyKey: String(parsed.tavilyKey || ""),
      serperKey: String(parsed.serperKey || ""),
    };
  } catch {
    return { ...DEFAULT_WEB_SEARCH_SETTINGS };
  }
}

export function writeWebSearchSettings(settings: WebSearchSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WEB_SEARCH_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* Storage may be unavailable in private/restricted browser contexts. */
  }
}

export function hasWebSearchKey(settings: WebSearchSettings = readWebSearchSettings()) {
  return Boolean(
    settings.geminiKey.trim() ||
      settings.tavilyKey.trim() ||
      settings.serperKey.trim(),
  );
}

export function clearWebSearchSettings() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WEB_SEARCH_SETTINGS_KEY);
  } catch {
    /* ignore */
  }
}
