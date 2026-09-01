import Link from "next/link";
import { notFound } from "next/navigation";
import { MoodChips } from "@/components/MoodChips";
import { MoodFeedClient } from "@/components/MoodFeedClient";
import { MoodSessionBoot } from "@/components/MoodSessionBoot";
import { BrowseSessionStrip } from "@/components/BrowseSessionStrip";
import { fetchDiscover, fetchFiltered } from "@/lib/anilist";
import { getMood, moodToFilters } from "@/lib/moods";
import type { Metadata } from "next";
import "./mood.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const mood = getMood(slug);
  if (!mood) return { title: "Tonight · AnimeNexus" };
  return {
    title: `${mood.emoji} ${mood.label} · AnimeNexus`,
    description: mood.blurb,
  };
}

export default async function MoodPage({ params }: Props) {
  const { slug } = await params;
  const mood = getMood(slug);
  if (!mood) notFound();

  let error: string | null = null;
  let items: Awaited<ReturnType<typeof fetchFiltered>>["data"] = [];
  let total = 0;

  try {
    if (mood.genres.length === 0) {
      const page = await fetchDiscover("top", 1, 24, "exclude");
      items = page.data;
      total = page.pagination.total;
      if (mood.minScore) {
        items = items.filter((a) => (a.score || 0) >= (mood.minScore || 0));
      }
    } else {
      const page = await fetchFiltered(moodToFilters(mood), 1, 24);
      items = page.data;
      total = page.pagination.total;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load";
  }

  return (
    <main>
      <MoodSessionBoot slug={mood.slug} />
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="container">
          <div className="hero-badge">Tonight · viewing intent</div>
          <h1>
            {mood.emoji} {mood.label}
          </h1>
          <p>{mood.blurb}</p>
          <MoodChips active={mood.slug} />
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 48 }}>
        <div className="section-head">
          <h2>
            <span className="accent">📡</span> Feed
          </h2>
          <span className="meta">
            {error ? "—" : `${items.length} shown${total ? ` · ${total.toLocaleString()} total` : ""}`}
          </span>
        </div>

        <BrowseSessionStrip />

        {error ? (
          <div className="state-box error">
            <p>Could not load this feed.</p>
            <p style={{ marginTop: 8, fontSize: "0.85rem" }}>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="state-box">
            <p>No titles matched this intent right now.</p>
            <p style={{ marginTop: 12 }}>
              <Link href="/browse" className="btn btn-accent btn-sm">
                Browse catalog
              </Link>
            </p>
          </div>
        ) : (
          <MoodFeedClient
            items={items}
            moodLabel={mood.label}
            experienceSlug={mood.slug}
          />
        )}

        <p style={{ marginTop: 28, textAlign: "center" }}>
          <Link href="/browse" className="btn btn-outline btn-sm">
            Open full filters →
          </Link>
        </p>
      </section>
    </main>
  );
}
