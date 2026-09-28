import { NextResponse } from "next/server";

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  publishedDate: string | null;
};

type SearchHit = {
  title?: string;
  url?: string;
  content?: string;
  publishedDate?: string;
};

type GeminiGroundingChunk = {
  web?: {
    uri?: string;
    title?: string;
  };
};

function cleanText(value: unknown, max = 1600): string {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function geminiWebSearch(
  query: string,
  context: string,
  spoilerBoundary: string,
  maxResults: number,
  key: string,
) {
  const trimmedKey = key.trim();
  if (!trimmedKey) return null;

  const model = process.env.GEMINI_WEB_MODEL?.trim() || "gemini-3.7-flash";
  const prompt = [
    "Answer the user's question using Google Search grounding.",
    "Use current, factual web evidence where available.",
    "For anime questions, prefer authoritative or primary sources when possible.",
    "Respect the spoiler boundary. Do not reveal plot information beyond it.",
    context ? `Anime/title context: ${context}` : "",
    spoilerBoundary ? `Spoiler boundary: ${spoilerBoundary}` : "",
    `User question: ${query}`,
  ]
    .filter(Boolean)
    .join("\n");

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=` +
    encodeURIComponent(trimmedKey);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2 },
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Gemini web search HTTP ${res.status}`);

  const json = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      groundingMetadata?: {
        groundingChunks?: GeminiGroundingChunk[];
      };
    }[];
  };

  const candidate = json.candidates?.[0];
  const answer = cleanText(
    candidate?.content?.parts?.map((p) => p.text || "").join(" ") || "",
    6000,
  );

  const chunks = candidate?.groundingMetadata?.groundingChunks || [];
  const seen = new Set<string>();
  const results: SearchResult[] = chunks
    .map((chunk) => ({
      title: cleanText(chunk.web?.title, 180),
      url: String(chunk.web?.uri || ""),
      snippet: "",
      publishedDate: null,
    }))
    .filter((r) => r.url && !seen.has(r.url) && seen.add(r.url))
    .slice(0, maxResults);

  if (!answer && !results.length) {
    throw new Error("Gemini returned no grounded web results");
  }

  return { answer, results };
}

async function tavily(query: string, maxResults: number, key: string) {
  const trimmedKey = key.trim();
  if (!trimmedKey) return null;

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: trimmedKey,
      query,
      search_depth: "advanced",
      topic: "general",
      max_results: maxResults,
      include_answer: false,
      include_raw_content: false,
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
  const json = (await res.json()) as { results?: SearchHit[] };
  return {
    answer: "",
    results: (json.results || []).map((r) => ({
      title: cleanText(r.title, 180),
      url: String(r.url || ""),
      snippet: cleanText(r.content, 1200),
      publishedDate: r.publishedDate || null,
    })),
  };
}

async function serper(query: string, maxResults: number, key: string) {
  const trimmedKey = key.trim();
  if (!trimmedKey) return null;

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": trimmedKey,
    },
    body: JSON.stringify({ q: query, num: maxResults }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
  const json = (await res.json()) as {
    organic?: { title?: string; link?: string; snippet?: string; date?: string }[];
  };
  return {
    answer: "",
    results: (json.organic || []).map((r) => ({
      title: cleanText(r.title, 180),
      url: String(r.link || ""),
      snippet: cleanText(r.snippet, 1200),
      publishedDate: r.date || null,
    })),
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      query?: string;
      maxResults?: number;
      context?: string;
      spoilerBoundary?: string;
      provider?: "auto" | "gemini" | "tavily" | "serper";
      keys?: {
        gemini?: string;
        tavily?: string;
        serper?: string;
      };
    };

    const query = cleanText(body.query, 500);
    if (!query) {
      return NextResponse.json({ ok: false, error: "Missing search query" }, { status: 400 });
    }

    const maxResults = Math.min(8, Math.max(3, Number(body.maxResults) || 5));
    const context = cleanText(body.context, 400);
    const spoilerBoundary = cleanText(body.spoilerBoundary, 300);

    const enrichedQuery = [
      query,
      context ? `Context: ${context}` : "",
      spoilerBoundary ? `Spoiler boundary: ${spoilerBoundary}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const keys = body.keys || {};
    const providerPreference = body.provider || "auto";
    const providers =
      providerPreference === "auto"
        ? ["gemini", "tavily", "serper"]
        : [providerPreference];

    let grounded: Awaited<ReturnType<typeof geminiWebSearch>> = null;
    let provider = "";

    for (const candidate of providers) {
      try {
        if (candidate === "gemini") {
          grounded = await geminiWebSearch(
            query,
            context,
            spoilerBoundary,
            maxResults,
            String(keys.gemini || ""),
          );
          if (grounded) provider = "gemini-google-search";
        } else if (candidate === "tavily") {
          grounded = await tavily(enrichedQuery, maxResults, String(keys.tavily || ""));
          if (grounded) provider = "tavily";
        } else if (candidate === "serper") {
          grounded = await serper(enrichedQuery, maxResults, String(keys.serper || ""));
          if (grounded) provider = "serper";
        }
        if (grounded) break;
      } catch {
        // A failed provider can fall through to the next user-configured provider.
      }
    }

    if (!grounded) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Web search could not run. Check your selected provider/key in AI Desk settings.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      provider,
      query,
      answer: grounded.answer || "",
      results: grounded.results.filter((r) => r.url).slice(0, maxResults),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Web search failed",
      },
      { status: 502 },
    );
  }
}
