import type { MetadataRoute } from "next";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://animenexus.vercel.app")
  ).replace(/\/$/, "");
}

const STATIC_PATHS = [
  "/",
  "/browse",
  "/watchlist",
  "/airing",
  "/daily",
  "/journey",
  "/account",
  "/tools",
  "/tools/status",
  "/tools/radar",
  "/tools/signals",
  "/tools/motion",
  "/cold-start",
];

type AniListPage = {
  data?: {
    Page?: {
      media?: { id: number; updatedAt?: number }[];
    };
  };
};

async function popularAnimeIds(
  limit = 500,
): Promise<{ id: number; updatedAt?: number }[]> {
  const out: { id: number; updatedAt?: number }[] = [];
  const perPage = 50;
  const pages = Math.ceil(limit / perPage);

  for (let page = 1; page <= pages; page++) {
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: `
            query ($page: Int, $perPage: Int) {
              Page(page: $page, perPage: $perPage) {
                media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
                  id
                  updatedAt
                }
              }
            }
          `,
          variables: { page, perPage },
        }),
        next: { revalidate: 86400 },
      });
      if (!res.ok) break;
      const json = (await res.json()) as AniListPage;
      const batch = json.data?.Page?.media || [];
      if (!batch.length) break;
      out.push(...batch);
      if (out.length >= limit) break;
    } catch {
      break;
    }
  }

  return out.slice(0, limit);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  let animeEntries: MetadataRoute.Sitemap = [];
  try {
    const media = await popularAnimeIds(500);
    animeEntries = media.map((m) => ({
      url: `${base}/anime/${m.id}`,
      lastModified: m.updatedAt ? new Date(m.updatedAt * 1000) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    animeEntries = [];
  }

  return [...staticEntries, ...animeEntries];
}
