import { NextResponse } from "next/server";

type SearchHit = {
  title?: string;
  url?: string;
  content?: string;
  publishedDate?: string;
};

function cleanText(value: unknown, max = 1600): string {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
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
  return (json.results || []).map((r) => ({
    title: cleanText(r.title, 180),
    url: String(r.url || ""),
    snippet: cleanText(r.content, 1200),
    publishedDate: r.publishedDate || null,
  }));
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
  return (json.organic || []).map((r) => ({
    title: cleanText(r.title, 180),
    url: String(r.link || ""),
    snippet: cleanText(r.snippet, 1200),
    publishedDate: r.date || null,
  }));
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

    // The search provider gets context so ambiguous anime questions resolve to
    // the right work, while the final model remains responsible for spoiler-safe synthesis.
    const enrichedQuery = [
      query,
      context ? `Context: ${context}` : "",
      spoilerBoundary ? `Spoiler boundary: ${spoilerBoundary}` : "",
    ].filter(Boolean).join("\n");

    let results = await tavily(enrichedQuery, maxResults);
    let provider = "tavily";

    if (!results) {
      results = await serper(enrichedQuery, maxResults);
      provider = "serper";
    }

    if (!results) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Web search is not configured. Add TAVILY_API_KEY or SERPER_API_KEY to the Vercel environment.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      provider,
      query,
      results: results.filter((r) => r.url).slice(0, maxResults),
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
