import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin cover proxy so WebGL textures can load AniList/MAL images.
 * Hardening: https only · no open redirect relay · host allowlist.
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

function parseAllowedHttpsUrl(raw: string): URL | null {
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return null;
  }
  if (target.protocol !== "https:") return null;
  if (!hostAllowed(target.hostname)) return null;
  return target;
}

export async function GET(req: NextRequest) {
  const raw =
    req.nextUrl.searchParams.get("u") || req.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  const target = parseAllowedHttpsUrl(raw);
  if (!target) {
    return NextResponse.json(
      { error: "url must be https and on an allowlisted host" },
      { status: 403 },
    );
  }

  try {
    const upstream = await fetch(target.toString(), {
      redirect: "manual",
      headers: {
        "User-Agent": "AnimeNexus-Lantern/1.0 (cover proxy)",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://anilist.co/",
      },
      next: { revalidate: 86400 },
    });

    let res = upstream;
    if ([301, 302, 303, 307, 308].includes(upstream.status)) {
      const loc = upstream.headers.get("location");
      if (!loc) {
        return NextResponse.json({ error: "bad redirect" }, { status: 502 });
      }
      const nextUrl = parseAllowedHttpsUrl(
        loc.startsWith("http") ? loc : new URL(loc, target).toString(),
      );
      if (!nextUrl) {
        return NextResponse.json(
          { error: "redirect host not allowed" },
          { status: 403 },
        );
      }
      res = await fetch(nextUrl.toString(), {
        redirect: "error",
        headers: {
          "User-Agent": "AnimeNexus-Lantern/1.0 (cover proxy)",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          Referer: "https://anilist.co/",
        },
        next: { revalidate: 86400 },
      });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "upstream " + res.status },
        { status: 502 },
      );
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "not an image" }, { status: 502 });
    }

    const buf = await res.arrayBuffer();
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
