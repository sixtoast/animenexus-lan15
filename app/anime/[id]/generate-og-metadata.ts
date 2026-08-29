import type { Metadata } from "next";
import { fetchAnimeById } from "@/lib/anilist";

/** Shared by page.tsx — dynamic OG for public anime links (Sprint 17). */
export async function generateAnimeOgMetadata(
  id: string,
): Promise<Metadata> {
  const num = parseInt(id, 10);
  if (isNaN(num)) return { title: "Anime · AnimeNexus" };
  try {
    const anime = await fetchAnimeById(num);
    if (!anime) return { title: "Not found · AnimeNexus" };
    const desc = (anime.description || "").slice(0, 160);
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://animenexus.vercel.app");
    const og = `${origin.replace(/\/+$/, "")}/api/og?kind=anime&title=${encodeURIComponent(anime.title.slice(0, 80))}&subtitle=${encodeURIComponent(desc.slice(0, 100))}`;
    return {
      title: `${anime.title} · AnimeNexus`,
      description: desc,
      openGraph: {
        title: `${anime.title} · AnimeNexus`,
        description: desc,
        images: [{ url: og, width: 1200, height: 630, alt: anime.title }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${anime.title} · AnimeNexus`,
        description: desc,
        images: [og],
      },
    };
  } catch {
    return { title: "Anime · AnimeNexus" };
  }
}
