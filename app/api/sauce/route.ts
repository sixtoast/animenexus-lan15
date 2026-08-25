import { NextRequest, NextResponse } from "next/server";
import { mapTraceResults, mergeSauceHits } from "@/lib/sauce";
import {
  isSauceNaoConfigured,
  searchSauceNaoByUrl,
} from "@/lib/providers/saucenao";
import { withProviderLimit } from "@/lib/provider-rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let traceRes: Response;
    let imageUrlForFallback: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("image");
      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { error: "Missing image file" },
          { status: 400 },
        );
      }
      const body = new FormData();
      body.append("image", file);
      traceRes = await withProviderLimit("tracemoe", async () =>
        fetch("https://api.trace.moe/search?anilistInfo=1", {
          method: "POST",
          body,
        }),
      );
    } else {
      const json = (await req.json().catch(() => null)) as {
        url?: string;
      } | null;
      const url = json?.url?.trim();
      if (!url || !/^https?:\/\//i.test(url)) {
        return NextResponse.json(
          { error: "Provide a valid image URL" },
          { status: 400 },
        );
      }
      imageUrlForFallback = url;
      traceRes = await withProviderLimit("tracemoe", async () =>
        fetch(
          `https://api.trace.moe/search?anilistInfo=1&url=${encodeURIComponent(url)}`,
        ),
      );
    }

    const providers: string[] = [];
    let primary = mapTraceResults({ result: [] });

    if (traceRes.ok) {
      const data = await traceRes.json();
      primary = mapTraceResults(data);
      providers.push("trace.moe");
    } else {
      const text = await traceRes.text();
      // Soft: try SauceNAO if URL path; else surface error
      if (!imageUrlForFallback || !isSauceNaoConfigured()) {
        return NextResponse.json(
          {
            error: `trace.moe HTTP ${traceRes.status}: ${text.slice(0, 200)}`,
            hits: [],
            matches: [],
            providers,
          },
          { status: 502 },
        );
      }
    }

    let sauceHits = primary.hits;
    if (
      imageUrlForFallback &&
      isSauceNaoConfigured() &&
      (sauceHits.length === 0 || sauceHits[0].similarity < 0.85)
    ) {
      const sn = await searchSauceNaoByUrl(imageUrlForFallback);
      if (sn.length) {
        providers.push("saucenao");
        sauceHits = mergeSauceHits(sauceHits, sn);
      }
    }

    return NextResponse.json({
      hits: sauceHits,
      matches: primary.matches,
      providers: providers.length ? providers : primary.providers,
      error: primary.error,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sauce search failed" },
      { status: 500 },
    );
  }
}
