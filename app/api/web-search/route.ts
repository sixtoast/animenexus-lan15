import { NextResponse } from "next/server";

type SearchResult = {\n  title: string;\n  url: string;\n  snippet: string;\n  publishedDate: string | null;\n};\n\ntype SearchHit = {
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
) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;

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
    encodeURIComponent(key);

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

async function tavily(query: string, maxResults: number) {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return null;

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
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

async function serper(query: string, maxResults: number) {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return null;

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": key,
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

    // Prefer Gemini's native Google Search grounding when configured. It gives
    // Lantern a grounded answer plus source URLs, while keeping the key server-side.
    let grounded = await geminiWebSearch(query, context, spoilerBoundary, maxResults);
    let provider = "gemini-google-search";

    if (!grounded) {
      grounded = await tavily(enrichedQuery, maxResults);
      provider = "tavily";
    }

    if (!grounded) {
      grounded = await serper(enrichedQuery, maxResults);
      provider = "serper";
    }

    if (!grounded) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Web search is not configured. Add GEMINI_API_KEY (recommended), TAVILY_API_KEY, or SERPER_API_KEY to the Vercel environment.",
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
