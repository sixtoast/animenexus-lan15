import Link from "next/link";
import { notFound } from "next/navigation";
import { MoodChips } from "@/components/MoodChips";
import { MoodFeedClient } from "@/components/MoodFeedClient";
import { MoodSessionBoot } from "@/components/MoodSessionBoot";
import { BrowseSessionStrip } from "@/components/BrowseSessionStrip";
import { getMood } from "@/lib/moods";
import { getExperienceIntent } from "@/lib/viewing-intent";
import { getMoodCandidatesBySlug } from "@/lib/mood-candidates";
import { summarizeRetrieval } from "@/lib/mood-retrieval-summary";
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

  const intent = getExperienceIntent(mood.slug);
  let error: string | null = null;
  let items: Awaited<
    ReturnType<typeof getMoodCandidatesBySlug>
  >["candidates"][number]["anime"][] = [];
  let retrievalNote = "";
  let modeLabel = "";
  let modeDetail = "";
  let modeClass = "mood-source-badge--offline";
  let liveChips: string[] = [];
  let offlineChips: string[] = [];

  try {
    const result = await getMoodCandidatesBySlug(mood.slug);
    items = result.candidates.map((c) => c.anime);
    if (mood.minScore) {
      items = items.filter((a) => {
        const s = a.score > 10 ? a.score : a.score * 10;
        return s >= mood.minScore!;
      });
    }
    const summary = summarizeRetrieval(result.retrieval);
    modeLabel = summary.label;
    modeDetail = summary.detail;
    modeClass =
      summary.mode === "live"
        ? "mood-source-badge--live"
        : summary.mode === "mixed"
          ? "mood-source-badge--mixed"
          : "mood-source-badge--offline";
    liveChips = summary.liveSources;
    offlineChips = summary.offlineSources;
    const ok = summary.liveSources.length + summary.offlineSources.length;
    retrievalNote = `${items.length} candidates · ${ok}/${result.retrieval.length} sources · ${result.dedupeCount} dupes removed`;
    if (!items.length && result.retrieval.every((r) => r.error || r.returned === 0)) {
      error =
        result.retrieval.map((r) => r.error).filter(Boolean).join("; ") ||
        "No sources returned data";
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to build mood candidates";
  }

  return (
    <main>
      <MoodSessionBoot slug={mood.slug} />
      <section className="hero" style={{ paddingBottom: 16 }}>
        <div className="container">
          <div className="hero-badge">
            Viewing intent · {mood.emoji} {mood.label}
          </div>
          <h1>
            What kind of night · <span>{mood.label}</span>
          </h1>
          <p>{mood.blurb}</p>
          <p className="meta" style={{ marginTop: 8 }}>
            Multi-source retrieval + intent fit — not a single genre filter.
            {intent?.genreHints?.length
              ? ` Hints: ${intent.genreHints.slice(0, 3).join(", ")}.`
              : ""}
          </p>
          <div style={{ marginTop: 20 }}>
            <MoodChips active={mood.slug} />
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 48 }}>
        <div className="section-head">
          <h2>
            <span className="accent">{mood.emoji}</span> Candidates for this
            intent
          </h2>
          <span className="meta">{error ? "—" : retrievalNote}</span>
        </div>

        {!error && modeLabel ? (
          <div className={`mood-source-panel ${modeClass}`} role="status">
            <div className="mood-source-badge">{modeLabel}</div>
            <p className="mood-source-detail">{modeDetail}</p>
            {(liveChips.length > 0 || offlineChips.length > 0) && (
              <div className="mood-source-chips">
                {liveChips.map((s) => (
                  <span key={s} className="mood-source-chip mood-source-chip--live">
                    {s}
                  </span>
                ))}
                {offlineChips.map((s) => (
                  <span
                    key={s}
                    className="mood-source-chip mood-source-chip--offline"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}

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
