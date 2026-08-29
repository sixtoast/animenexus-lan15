import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { OG_SIZE, type OgKind, isPrivateOgKind } from "@/lib/og";

export const runtime = "edge";

function parseKind(raw: string | null): OgKind {
  const k = (raw || "site") as OgKind;
  const allowed: OgKind[] = [
    "site",
    "anime",
    "tool",
    "session",
    "journey",
    "taste",
    "shelf",
    "compare",
  ];
  return allowed.includes(k) ? k : "site";
}

/**
 * Dynamic OG composition (Sprint 17).
 * Private kinds require share=1 — otherwise falls back to public site card.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  let kind = parseKind(searchParams.get("kind"));
  const share = searchParams.get("share") === "1";
  const title =
    searchParams.get("title")?.slice(0, 80) ||
    (kind === "anime" ? "Anime" : "AnimeNexus");
  const subtitle =
    searchParams.get("subtitle")?.slice(0, 100) ||
    "Lantern · mood, shelf, and signal";
  const tool = searchParams.get("tool")?.slice(0, 40) || "";
  const a = searchParams.get("a")?.slice(0, 40) || "";
  const b = searchParams.get("b")?.slice(0, 40) || "";

  if (isPrivateOgKind(kind) && !share) {
    kind = "site";
  }

  const kicker =
    kind === "anime"
      ? "Title · AnimeNexus"
      : kind === "tool"
        ? `Tool · ${tool || "Desk"}`
        : kind === "compare"
          ? "Compare · AnimeNexus"
          : kind === "session"
            ? "Session Cover · shared"
            : kind === "journey"
              ? "Journey · shared"
              : kind === "taste"
                ? "Taste · shared"
                : kind === "shelf"
                  ? "Shelf · shared"
                  : "AnimeNexus · Lantern";

  const main =
    kind === "compare" && (a || b)
      ? `${a || "A"}  ×  ${b || "B"}`
      : title;

  const sub =
    kind === "tool" && tool
      ? subtitle || `${tool} on the Night Desk`
      : subtitle;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: "linear-gradient(145deg, #120e0c 0%, #1a1412 55%, #0e0b0a 100%)",
          color: "#f5ebe6",
          fontFamily: "Georgia, Times New Roman, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#e8a598",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 600,
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              fontSize: main.length > 40 ? 48 : 56,
              fontWeight: 600,
              lineHeight: 1.15,
              maxWidth: 1000,
            }}
          >
            {main}
          </div>
          <div
            style={{
              fontSize: 26,
              color: "rgba(245,235,230,0.72)",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 400,
              maxWidth: 920,
              lineHeight: 1.35,
            }}
          >
            {sub}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "system-ui, sans-serif",
            fontSize: 20,
            color: "rgba(245,235,230,0.4)",
          }}
        >
          <span>animenexus · lantern</span>
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              border: "2px solid rgba(232,165,152,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e8a598",
              fontSize: 22,
            }}
          >
            ◉
          </span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
