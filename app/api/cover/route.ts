import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin cover proxy so WebGL textures can load AniList/MAL images.
 * Browser <img> works without CORS; THREE.Texture does not.
 */

const ALLOWED = new Set([
  "s4.anilist.co",
  "img.anili.st",
  "cdn.myanimelist.net",
  "api-cdn.myanimelist.net",
  "placehold.co",
  "res.cloudinary.com",
  "media.kitsu.app",
  "media.kitsu.io",
  "shikimori.one",
  "nyaa.shikimori.one",
]);

function hostAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (ALLOWED.has(h)) return true;
  if (h.endsWith(".anilist.co")) return true;
  if (h.endsWith(".myanimelist.net")) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const raw =
    req.nextUrl.searchParams.get("u") || req.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "bad protocol" }, { status: 400 });
  }

  if (!hostAllowed(target.hostname)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent": "AnimeNexus-Lantern/1.0 (cover proxy)",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://anilist.co/",
      },
      next: { revalidate: 86400 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "upstream " + upstream.status },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "not an image" }, { status: 502 });
    }

    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
