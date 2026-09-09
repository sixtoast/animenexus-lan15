/** Browser-side AI config — persists across redeploys on the same origin. */

export const AI_SETTINGS_KEY = "anime_nexus_ai_settings";
/** Cookie mirror so settings survive some storage clears / private-session edge cases. */
export const AI_SETTINGS_COOKIE = "an_ai_settings_v1";

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

/** Optional site-wide defaults from Vercel env (survive every redeploy). */
function envDefaults(): Partial<AISettings> {
  const key =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_AI_API_KEY?.trim()) ||
    "";
  const baseUrl =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_AI_BASE_URL?.trim()) ||
    "";
  const model =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_AI_MODEL?.trim()) ||
    "";
  const providerRaw =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_AI_PROVIDER?.trim()) ||
    "";
  const provider = (
    ["openrouter", "openai", "gemini", "groq", "custom"] as const
  ).includes(providerRaw as AIProviderId)
    ? (providerRaw as AIProviderId)
    : undefined;

  const out: Partial<AISettings> = {};
  if (key) out.apiKey = key;
  if (baseUrl) out.baseUrl = baseUrl;
  if (model) out.model = model;
  if (provider) out.provider = provider;
  return out;
}

export function defaultSettings(): AISettings {
  const p = AI_PRESETS.openrouter;
  const env = envDefaults();
  const provider = env.provider || "openrouter";
  const preset =
    provider !== "custom" && provider in AI_PRESETS
      ? AI_PRESETS[provider as Exclude<AIProviderId, "custom">]
      : p;
  return {
    provider,
    baseUrl: env.baseUrl || preset.baseUrl,
    model: env.model || preset.model,
    apiKey: env.apiKey || "",
    fallbackProvider: "",
    fallbackKey: "",
  };
}

function readCookie(): Partial<AISettings> | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${AI_SETTINGS_COOKIE}=`));
    if (!match) return null;
    const raw = decodeURIComponent(match.slice(AI_SETTINGS_COOKIE.length + 1));
    if (!raw) return null;
    return JSON.parse(raw) as Partial<AISettings>;
  } catch {
    return null;
  }
}

function writeCookie(s: AISettings) {
  if (typeof document === "undefined") return;
  try {
    const payload = {
      provider: s.provider,
      baseUrl: s.baseUrl,
      model: s.model,
      apiKey: s.apiKey,
      fallbackProvider: s.fallbackProvider || "",
      fallbackKey: s.fallbackKey || "",
    };
    const encoded = encodeURIComponent(JSON.stringify(payload));
    if (encoded.length > 3500) return;
    const maxAge = 60 * 60 * 24 * 400;
    const secure =
      typeof location !== "undefined" && location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${AI_SETTINGS_COOKIE}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  } catch {
    /* private mode / blocked */
  }
}

function repairBaseUrl(merged: AISettings): AISettings {
  const base = (merged.baseUrl || "").trim();
  if (!base || base.startsWith("/") || !/^https?:\/\//i.test(base)) {
    const preset =
      merged.provider !== "custom" && merged.provider in AI_PRESETS
        ? AI_PRESETS[merged.provider as Exclude<AIProviderId, "custom">]
        : AI_PRESETS.openrouter;
    merged.baseUrl = preset.baseUrl;
    if (!merged.model) merged.model = preset.model;
  }
  return merged;
}

export function readAISettings(): AISettings {
  if (typeof window === "undefined") return defaultSettings();

  const env = envDefaults();
  let fromStorage: Partial<AISettings> | null = null;
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (raw) fromStorage = JSON.parse(raw) as Partial<AISettings>;
  } catch {
    fromStorage = null;
  }

  const fromCookie = readCookie();

  const merged = repairBaseUrl({
    ...defaultSettings(),
    ...env,
    ...(fromCookie || {}),
    ...(fromStorage || {}),
  });

  if (!merged.apiKey) {
    merged.apiKey =
      fromStorage?.apiKey || fromCookie?.apiKey || env.apiKey || "";
  }

  if (merged.apiKey && !fromStorage?.apiKey) {
    try {
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(merged));
    } catch {
      /* quota */
    }
  }

  return merged;
}

export function writeAISettings(s: AISettings) {
  if (typeof window === "undefined") return;
  const next = repairBaseUrl({ ...s });
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

  try {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* quota / private */
  }
  writeCookie(next);
}

export function isAIConfigured(s?: AISettings): boolean {
  const cfg = s || (typeof window !== "undefined" ? readAISettings() : null);
  if (!cfg?.apiKey) return false;
  const base = (cfg.baseUrl || "").trim();
  if (!base) return false;
  if (base.startsWith("/")) return false;
  return true;
}

/** Clear stored keys (settings UI). Does not clear Vercel env defaults. */
export function clearAISettings() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AI_SETTINGS_KEY);
  } catch {
    /* */
  }
  try {
    document.cookie = `${AI_SETTINGS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {
    /* */
  }
}
