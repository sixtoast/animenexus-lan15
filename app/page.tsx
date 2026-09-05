import Link from "next/link";
import { AnimeGrid } from "@/components/AnimeGrid";
import { HeroGreeting } from "@/components/HeroGreeting";
import { QuoteBanner } from "@/components/QuoteBanner";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { MoodChips } from "@/components/MoodChips";
import { HomeDashboard } from "@/components/HomeDashboard";
import { TonightDesk } from "@/components/TonightDesk";
import { DiscoveryShelves } from "@/components/DiscoveryShelves";
import { ProviderHealth } from "@/components/ProviderHealth";
import { WhatLanternLearned } from "@/components/WhatLanternLearned";
import { ColdStartStrip } from "@/components/ColdStartStrip";
import { AvailableNowStrip } from "@/components/AvailableNowStrip";
import { DeskNotesStrip } from "@/components/DeskNotesStrip";
import { RitualLine } from "@/components/RitualLine";
import { HomePrimaryMoment } from "@/components/HomePrimaryMoment";
import { HomeYourWorld } from "@/components/HomeYourWorld";
import {
  generateCandidatePool,
  poolToAnimeList,
} from "@/lib/recommend-candidates";
import "./mood-home.css";
import "./home-dash.css";
import "./home-v2.css";
import "./tonight-desk.css";
import "./cold-start.css";
import "./desk-notes.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let error: string | null = null;
  let items: import("@/lib/types").Anime[] = [];
  let total = 0;
  let poolVersion = "candidate_v1";

  try {
    // R4: multi-source pool (no shelf on SSR — still trending+popular+top+exploration)
    const pool = await generateCandidatePool({
      entries: [],
      perSource: 36,
      maxPool: 180,
    });
    items = poolToAnimeList(pool);
    total = items.length;
    poolVersion = pool.version;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to reach catalog";
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
            <Link href="/browse" className="btn btn-outline btn-sm">
              Discover
            </Link>
            <Link href="/watchlist" className="btn btn-ghost btn-sm">
              Shelf
            </Link>
          </div>

          <div className="mood-home-block home-mood">
            <p className="mood-home-label">What kind of night</p>
            <MoodChips />
          </div>
        </div>
      </section>

      <section className="container home-body">
        <div
          className="home-panel home-panel-selective"
          data-mascot-landmark="rail"
          data-mascot-id="home-desk"
          data-mascot-priority="4"
        >
          {/* Layer 1 — one decision */}
          <HomePrimaryMoment candidates={items} />

          {/* Layer 2 — your world */}
          <HomeYourWorld />

          {/* Soft utility — not equal prominence */}
          <ColdStartStrip />
          <DeskNotesStrip />
          <AvailableNowStrip candidates={items} />

          {/* Layer 3 — discover */}
          <DiscoveryShelves candidates={items} />

          {/* Deeper tools: still available, not the first impression */}
          <details className="home-more-desk">
            <summary>More desk</summary>
            <TonightDesk candidates={items} />
            <WhatLanternLearned />
            <HomeDashboard trending={items} />
            <ProviderHealth />
          </details>
        </div>

        <QuoteBanner />

        <div className="home-trending-head">
          <div className="section-head">
            <h2>On the air</h2>
            <span className="meta">
              {error
                ? "—"
                : `${items.length} candidates · ${poolVersion}`}
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
            <AnimeGrid
              items={items.slice(0, 24)}
              trackBehaviour
              shelf="home_trending"
              source="candidate_pool"
            />
          </div>
        )}
      </section>
    </main>
  );
}
