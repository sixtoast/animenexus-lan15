import Link from "next/link";
import { AnimeGrid } from "@/components/AnimeGrid";
import { HeroGreeting } from "@/components/HeroGreeting";
import { QuoteBanner } from "@/components/QuoteBanner";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { MoodChips } from "@/components/MoodChips";
import { HomeDashboard } from "@/components/HomeDashboard";
import { RitualLine } from "@/components/RitualLine";
import { fetchDiscover } from "@/lib/anilist";
import "./mood-home.css";
import "./home-dash.css";
import "./home-v2.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let error: string | null = null;
  let items: Awaited<ReturnType<typeof fetchDiscover>>["data"] = [];
  let total = 0;

  try {
    const page = await fetchDiscover("trending", 1, 24, "exclude");
    items = page.data;
    total = page.pagination.total;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to reach AniList";
  }

  return (
    <main className="home-main">
      <section
        className="hero home-hero"
        data-mascot-landmark="hero"
        data-mascot-id="home-hero"
        data-mascot-priority="2"
      >
        <div className="container home-hero-inner">
          <HeroGreeting />
          <div className="hero-badge">Lantern · late-night console</div>
          <h1>
            AnimeNexus <span>Lantern</span>
          </h1>
          <p className="home-lead">
            Your local desk for moods, shelves, and signals. Watchlist stays in
            this browser — Lantern remembers what you open.
          </p>

          <RitualLine />

          <div
            className="home-hero-actions"
            data-mascot-landmark="button"
            data-mascot-id="home-ctas"
            data-mascot-priority="3"
          >
            <Link href="/daily" className="btn btn-accent btn-sm">
              Today’s signal
            </Link>
            <Link href="/browse" className="btn btn-outline btn-sm">
              Browse catalog
            </Link>
            <Link href="/watchlist" className="btn btn-ghost btn-sm">
              Watchlist
            </Link>
          </div>

          <div className="mood-home-block home-mood">
            <p className="mood-home-label">Tune by mood</p>
            <MoodChips />
          </div>
        </div>
      </section>

      <section className="container home-body">
        <div
          className="home-panel"
          data-mascot-landmark="rail"
          data-mascot-id="home-desk"
          data-mascot-priority="4"
        >
          <HomeDashboard trending={[]} />
        </div>

        <QuoteBanner />

        <div className="home-trending-head">
          <div className="section-head">
            <h2>Trending now</h2>
            <span className="meta">
              {error
                ? "—"
                : `${items.length} shown · ${total.toLocaleString()} in catalog`}
            </span>
          </div>
          <ViewModeToggle />
        </div>

        {error ? (
          <div className="state-box error lantern-empty">
            <h3>Couldn’t reach the catalog</h3>
            <p>{error}</p>
          </div>
        ) : (
          <div
            data-mascot-landmark="card"
            data-mascot-id="trending-grid"
            data-mascot-priority="5"
          >
            <AnimeGrid items={items} />
          </div>
        )}
      </section>
    </main>
  );
}
