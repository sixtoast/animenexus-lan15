import { NextRequest, NextResponse } from "next/server";
import { mapTraceResults } from "@/lib/sauce";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let traceRes: Response;

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
      traceRes = await fetch("https://api.trace.moe/search?anilistInfo=1", {
        method: "POST",
        body,
      });
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
      traceRes = await fetch(
        `https://api.trace.moe/search?anilistInfo=1&url=${encodeURIComponent(url)}`,
      );
    }

    if (!traceRes.ok) {
      const text = await traceRes.text();
      return NextResponse.json(
        {
          error: `trace.moe HTTP ${traceRes.status}: ${text.slice(0, 200)}`,
        },
        { status: 502 },
      );
    }

    const data = await traceRes.json();
    return NextResponse.json(mapTraceResults(data));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sauce search failed" },
      { status: 500 },
    );
  }
}
