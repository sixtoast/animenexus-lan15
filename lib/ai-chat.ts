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

async function callOnce(
  cfg: Cfg,
  messages: ChatMessage[],
  opts: { temperature?: number } = {},
): Promise<string> {
  if (!cfg.apiKey) throw new Error("Missing API key");
  if (!cfg.baseUrl) throw new Error("Missing API base URL");
  const base = cfg.baseUrl.replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
      "HTTP-Referer":
        typeof window !== "undefined" ? window.location.origin : "",
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

/** Stream tokens when the provider supports SSE; falls back to full response. */
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
    const base = cfg.baseUrl.replace(/\/$/, "");
    const url = `${base}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        "HTTP-Referer":
          typeof window !== "undefined" ? window.location.origin : "",
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
      throw new Error(
        `AI HTTP ${res.status}${errText ? `: ${errText.slice(0, 180)}` : ""}`,
      );
    }
    const ctype = res.headers.get("content-type") || "";
    if (!res.body || !ctype.includes("text/event-stream")) {
      // Provider ignored stream — parse as JSON
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content || "";
      if (content) opts.onToken?.(content);
      return content.trim();
    }
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
          /* skip malformed chunk */
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
        /* fall through to non-stream */
      }
    }
    // Final fallback: non-streaming full response
    try {
      return await callChatCompletions(messages, opts);
    } catch (err) {
      throw e instanceof Error ? e : err;
    }
  }
}

function resolveCfg(settings: AISettings) {
  return {
    baseUrl: settings.baseUrl,
    model: settings.model,
    apiKey: settings.apiKey,
  };
}

function resolveFallback(settings: AISettings) {
  if (!settings.fallbackKey) return null;
  const pid = (settings.fallbackProvider || "openrouter") as AIProviderId;
  const preset =
    pid !== "custom" && pid in AI_PRESETS
      ? AI_PRESETS[pid as Exclude<AIProviderId, "custom">]
      : null;
  return {
    baseUrl: preset?.baseUrl || settings.baseUrl,
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
