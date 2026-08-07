import Link from "next/link";
import { AnimeGrid } from "@/components/AnimeGrid";
import { fetchAiring, fetchSeasonal } from "@/lib/anilist-discover";
import {
  allSeasonsAround,
  currentSeason,
  seasonLabel,
  type AniSeason,
} from "@/lib/season";
import type { Metadata } from "next";
import "./seasonal.css";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ season?: string; year?: string }>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const sp = await searchParams;
  const cur = currentSeason();
  const season = (sp.season?.toUpperCase() as AniSeason) || cur.season;
  const year = sp.year ? parseInt(sp.year, 10) : cur.year;
  return {
    title: `${seasonLabel(season)} ${year} · AnimeNexus`,
    description: `Seasonal anime chart for ${seasonLabel(season)} ${year}`,
  };
}

export default async function SeasonalPage({ searchParams }: Props) {
  const sp = await searchParams;
  const cur = currentSeason();
  const season = (
    ["WINTER", "SPRING", "SUMMER", "FALL"].includes(
      (sp.season || "").toUpperCase(),
    )
      ? (sp.season!.toUpperCase() as AniSeason)
      : cur.season
  );
  const year = sp.year ? parseInt(sp.year, 10) : cur.year;
  const tabs = allSeasonsAround();

  let seasonalError: string | null = null;
  let airingError: string | null = null;
  let seasonalItems: Awaited<ReturnType<typeof fetchSeasonal>>["data"] = [];
  let seasonalTotal = 0;
  let airingItems: Awaited<ReturnType<typeof fetchAiring>>["data"] = [];

  try {
    const page = await fetchSeasonal(season, year, 1, 24);
    seasonalItems = page.data;
    seasonalTotal = page.pagination.total;
  } catch (e) {
    seasonalError = e instanceof Error ? e.message : "Failed to load season";
  }

  try {
    const page = await fetchAiring(1, 12);
    airingItems = page.data;
  } catch (e) {
    airingError = e instanceof Error ? e.message : "Failed to load airing";
  }

  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Discover · Sprint 8</div>
          <h1>
            {seasonLabel(season)} <span>{year}</span>
          </h1>
          <p>
            Seasonal popularity chart and what’s still on the air. Daily pick is
            on a separate frequency.
          </p>
          <div className="season-tabs">
            {tabs.map((t) => {
              const active = t.season === season && t.year === year;
              return (
                <Link
                  key={`${t.season}-${t.year}`}
                  href={`/seasonal?season=${t.season}&year=${t.year}`}
                  className={"season-tab" + (active ? " active" : "")}
                >
                  {seasonLabel(t.season)} {t.year}
                </Link>
              );
            })}
          </div>
          <p style={{ marginTop: 14 }}>
            <Link href="/daily" className="btn btn-outline btn-sm">
              Today’s pick →
            </Link>
          </p>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 32 }}>
        <div className="section-head">
          <h2>
            <span className="accent">📺</span> Seasonal chart
          </h2>
          <span className="meta">
            {seasonalError
              ? "—"
              : `${seasonalItems.length} shown · ${seasonalTotal.toLocaleString()} in season`}
          </span>
        </div>
        {seasonalError ? (
          <div className="state-box error">
            <p>{seasonalError}</p>
          </div>
        ) : (
          <AnimeGrid items={seasonalItems} />
        )}
      </section>

      <section className="container" style={{ paddingBottom: 48 }}>
        <div className="section-head">
          <h2>
            <span className="accent">🔴</span> Airing now
          </h2>
          <span className="meta">
            {airingError ? "—" : `${airingItems.length} popular airing`}
          </span>
        </div>
        {airingError ? (
          <div className="state-box error">
            <p>{airingError}</p>
          </div>
        ) : (
          <AnimeGrid items={airingItems} />
        )}
      </section>
    </main>
  );
}
