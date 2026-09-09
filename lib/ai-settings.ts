/** Browser-side AI config — matches SPA key anime_nexus_ai_settings */

export const AI_SETTINGS_KEY = "anime_nexus_ai_settings";

export type AIProviderId =
  | "openrouter"
  | "openai"
  | "gemini"
  | "groq"
  | "custom";

export type AISettings = {
  provider: AIProviderId;
  baseUrl: string;
  model: string;
  apiKey: string;
  fallbackProvider?: string;
  fallbackKey?: string;
};

export const AI_PRESETS: Record<
  Exclude<AIProviderId, "custom">,
  { baseUrl: string; model: string; hint: string }
> = {
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
    hint: "https://openrouter.ai/keys",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    hint: "https://platform.openai.com/api-keys",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
    hint: "https://aistudio.google.com/apikey",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    hint: "https://console.groq.com/keys",
  },
};

export function defaultSettings(): AISettings {
  const p = AI_PRESETS.openrouter;
  return {
    provider: "openrouter",
    baseUrl: p.baseUrl,
    model: p.model,
    apiKey: "",
    fallbackProvider: "",
    fallbackKey: "",
  };
}

export function readAISettings(): AISettings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<AISettings>;
    const merged = { ...defaultSettings(), ...parsed };
    const base = (merged.baseUrl || "").trim();
    // Repair broken relative / empty base URLs from older saves
    if (!base || base.startsWith("/") || !/^https?:\/\//i.test(base)) {
      const preset =
        merged.provider !== "custom" && merged.provider in AI_PRESETS
          ? AI_PRESETS[merged.provider as Exclude<AIProviderId, "custom">]
          : AI_PRESETS.openrouter;
      merged.baseUrl = preset.baseUrl;
      if (!merged.model) merged.model = preset.model;
    }
    return merged;
  } catch {
    return defaultSettings();
  }
}

export function writeAISettings(s: AISettings) {
  if (typeof window === "undefined") return;
  const next = { ...s };
  let base = (next.baseUrl || "").trim().replace(/\/+$/, "");
  if (!base || base.startsWith("/")) {
    const preset =
      next.provider !== "custom" && next.provider in AI_PRESETS
        ? AI_PRESETS[next.provider as Exclude<AIProviderId, "custom">]
        : AI_PRESETS.openrouter;
    base = preset.baseUrl;
    next.baseUrl = base;
    if (!next.model) next.model = preset.model;
  }
  next.baseUrl = base.replace(/\/chat\/completions$/i, "").replace(/\/+$/, "");
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(next));
}

export function isAIConfigured(s?: AISettings): boolean {
  const cfg = s || (typeof window !== "undefined" ? readAISettings() : null);
  if (!cfg?.apiKey) return false;
  const base = (cfg.baseUrl || "").trim();
  if (!base) return false;
  if (base.startsWith("/")) return false;
  return true;
}
