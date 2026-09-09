import {
  readAISettings,
  type AISettings,
  AI_PRESETS,
  type AIProviderId,
} from "./ai-settings";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type Cfg = { baseUrl: string; model: string; apiKey: string };

/**
 * Ensure we always hit an absolute provider API, never a relative path on
 * the AnimeNexus origin (that yields Next.js HTML 404s like dpl- / _next_error_).
 */
export function normalizeAIBaseUrl(raw: string, provider?: AIProviderId): string {
  let u = (raw || "").trim().replace(/\/+$/, "");
  if (!u) {
    const preset =
      provider && provider !== "custom" ? AI_PRESETS[provider] : AI_PRESETS.openrouter;
    return preset.baseUrl.replace(/\/+$/, "");
  }
  if (u.startsWith("/") || !/^https?:\/\//i.test(u)) {
    if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(u) && !u.includes(" ")) {
      u = `https://${u}`.replace(/\/+$/, "");
    } else {
      return AI_PRESETS.openrouter.baseUrl.replace(/\/+$/, "");
    }
  }
  if (/^https:\/\/openrouter\.ai$/i.test(u)) {
    u = "https://openrouter.ai/api/v1";
  }
  if (/^https:\/\/api\.openai\.com$/i.test(u)) {
    u = "https://api.openai.com/v1";
  }
  if (/^https:\/\/api\.groq\.com$/i.test(u)) {
    u = "https://api.groq.com/openai/v1";
  }
  u = u.replace(/\/chat\/completions$/i, "");
  return u.replace(/\/+$/, "");
}

function assertSafeProviderUrl(url: string) {
  if (typeof window !== "undefined") {
    try {
      const target = new URL(url);
      if (target.origin === window.location.origin) {
        throw new Error(
          "AI base URL points at this site, not a model provider. Open AI settings and set Base URL to e.g. https://openrouter.ai/api/v1 (or pick a provider preset).",
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("AI base URL")) throw e;
    }
  }
  if (!/^https:\/\//i.test(url)) {
    throw new Error(
      `AI base URL must be https://\u2026 (got \u201c${url.slice(0, 60)}\u201d). Pick a provider preset in AI settings.`,
    );
  }
}

async function callOnce(
  cfg: Cfg,
  messages: ChatMessage[],
  opts: { temperature?: number } = {},
): Promise<string> {
  if (!cfg.apiKey) throw new Error("Missing API key");
  const base = normalizeAIBaseUrl(cfg.baseUrl);
  if (!base) throw new Error("Missing API base URL");
  const url = `${base}/chat/completions`;
  assertSafeProviderUrl(url);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
      "HTTP-Referer":
        typeof window !== "undefined"
          ? window.location.origin
          : "https://animenexus.app",
      "X-Title": "AnimeNexus Lantern",
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: opts.temperature ?? 0.7,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const looksLikeNext =
      errText.includes("_next_error_") ||
      errText.includes("dpl_") ||
      errText.includes("<!DOCTYPE html>");
    if (looksLikeNext || res.status === 404) {
      throw new Error(
        `AI HTTP ${res.status}: request hit the wrong host (got app HTML, not the model API). ` +
          `Check Base URL in AI settings \u2014 use https://openrouter.ai/api/v1 or another provider preset. ` +
          `Attempted: ${url}`,
      );
    }
    throw new Error(
      `AI HTTP ${res.status}${errText ? `: ${errText.slice(0, 180)}` : ""}`,
    );
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty model response");
  return content.trim();
}

export async function streamChatCompletions(
  messages: ChatMessage[],
  opts: {
    temperature?: number;
    settings?: AISettings;
    onToken?: (chunk: string) => void;
  } = {},
): Promise<string> {
  const settings = opts.settings || readAISettings();
  const tryStream = async (cfg: Cfg) => {
    if (!cfg.apiKey) throw new Error("Missing API key");
    const base = normalizeAIBaseUrl(cfg.baseUrl, settings.provider);
    const url = `${base}/chat/completions`;
    assertSafeProviderUrl(url);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        "HTTP-Referer":
          typeof window !== "undefined"
            ? window.location.origin
            : "https://animenexus.app",
        "X-Title": "AnimeNexus Lantern",
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.7,
        stream: true,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const looksLikeNext =
        errText.includes("_next_error_") ||
        errText.includes("<!DOCTYPE html>");
      if (looksLikeNext || res.status === 404) {
        throw new Error(
          `AI HTTP ${res.status}: wrong host (app HTML). Fix Base URL in AI settings. Attempted: ${url}`,
        );
      }
      throw new Error(
        `AI HTTP ${res.status}${errText ? `: ${errText.slice(0, 180)}` : ""}`,
      );
    }
    if (!res.body) throw new Error("No stream body");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const j = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[];
          };
          const piece = j.choices?.[0]?.delta?.content || "";
          if (piece) {
            full += piece;
            opts.onToken?.(piece);
          }
        } catch {
          /* skip */
        }
      }
    }
    if (!full.trim()) throw new Error("Empty stream response");
    return full.trim();
  };

  try {
    return await tryStream(resolveCfg(settings));
  } catch (e) {
    const fb = resolveFallback(settings);
    if (fb) {
      try {
        return await tryStream(fb);
      } catch {
        /* fall through */
      }
    }
    try {
      return await callChatCompletions(messages, opts);
    } catch (err) {
      throw e instanceof Error ? e : err;
    }
  }
}

function resolveCfg(settings: AISettings): Cfg {
  return {
    baseUrl: normalizeAIBaseUrl(settings.baseUrl, settings.provider),
    model: settings.model || AI_PRESETS.openrouter.model,
    apiKey: settings.apiKey,
  };
}

function resolveFallback(settings: AISettings): Cfg | null {
  if (!settings.fallbackKey) return null;
  const pid = (settings.fallbackProvider || "openrouter") as AIProviderId;
  const preset =
    pid !== "custom" && pid in AI_PRESETS
      ? AI_PRESETS[pid as Exclude<AIProviderId, "custom">]
      : null;
  return {
    baseUrl: normalizeAIBaseUrl(preset?.baseUrl || settings.baseUrl, pid),
    model: preset?.model || settings.model,
    apiKey: settings.fallbackKey,
  };
}

export async function callChatCompletions(
  messages: ChatMessage[],
  opts: { temperature?: number; settings?: AISettings } = {},
): Promise<string> {
  const settings = opts.settings || readAISettings();
  try {
    return await callOnce(resolveCfg(settings), messages, opts);
  } catch (e) {
    const fb = resolveFallback(settings);
    if (!fb) throw e;
    return await callOnce(fb, messages, opts);
  }
}

export async function testAIConnection(): Promise<string> {
  return callChatCompletions(
    [
      { role: "system", content: "Reply with exactly: AnimeNexus AI online." },
      { role: "user", content: "ping" },
    ],
    { temperature: 0 },
  );
}
