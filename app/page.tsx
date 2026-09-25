import Link from "next/link";
import { AnimeGrid } from "@/components/AnimeGrid";
import { HeroGreeting } from "@/components/HeroGreeting";
import { TonightIntentPanel } from "@/components/TonightIntentPanel";
import { DiscoveryShelves } from "@/components/DiscoveryShelves";
import { AvailableNowStrip } from "@/components/AvailableNowStrip";
import { HomePrimaryMoment } from "@/components/HomePrimaryMoment";
import { HomeYourWorld } from "@/components/HomeYourWorld";
import { QuoteBanner } from "@/components/QuoteBanner";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { SessionQuietNote } from "@/components/SessionQuietNote";
import { ColdStartPath } from "@/components/ColdStartPath";
import { ReturningRecap } from "@/components/ReturningRecap";
import { ColdStartStrip } from "@/components/ColdStartStrip";
import { DeskNotesStrip } from "@/components/DeskNotesStrip";
import { generateCandidatePool, poolToAnimeList } from "@/lib/recommend-candidates";
import "./mood-home.css";
import "./home-dash.css";
import "./home-v2.css";
import "./tonight-desk.css";
import "./cold-start.css";
import "./desk-notes.css";
import "./tonight-intent.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let error: string | null = null;
  let items: import("@/lib/types").Anime[] = [];
  let poolVersion = "candidate_v1";

  try {
    const pool = await generateCandidatePool({ entries: [], perSource: 36, maxPool: 180 });
    items = poolToAnimeList(pool);
    poolVersion = pool.version;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to reach catalog";
  }

  const heroAnime = items[0];

  return (
    <main className="home-main cinema-home">
      <section className="hero home-hero" data-mascot-landmark="hero" data-mascot-id="home-hero" data-mascot-priority="2">
        {heroAnime?.image ? (
          <div aria-hidden className="cinema-hero-art" style={{ backgroundImage: `url("${heroAnime.image}")` }} />
        ) : null}
        <div className="container home-hero-inner">
          <HeroGreeting />
          <div className="hero-badge">ANIMENEXUS / LANTERN</div>
          <h1>Find the <span>next</span> story.</h1>
          <p className="home-lead">
            A personal anime desk built around what you want to watch, not what a ranking says you should watch.
          </p>
          <div className="mood-home-block home-mood home-mood--primary"><TonightIntentPanel compact /></div>
          <div className="home-hero-actions home-hero-actions--secondary">
            <Link href="/browse" className="btn btn-accent btn-sm">Explore the catalogue</Link>
            <Link href="/watchlist" className="btn btn-ghost btn-sm">Open your shelf</Link>
          </div>
        </div>
      </section>

      <section className="container home-body">
        <div className="home-panel-selective">
          <HomePrimaryMoment candidates={items} />
          <HomeYourWorld />
          <ColdStartPath />
          <ReturningRecap />
          <ColdStartStrip />
          <DeskNotesStrip />
          <AvailableNowStrip candidates={items} />
          <DiscoveryShelves candidates={items} />
        </div>

        <QuoteBanner />

        <section className="cinema-catalog" aria-labelledby="catalog-heading">
          <div className="home-trending-head">
            <div className="section-head">
              <h2 id="catalog-heading">On the air</h2>
              <span className="meta">{error ? "catalog unavailable" : `${items.length} signals / ${poolVersion}`}</span>
            </div>
            <ViewModeToggle />
          </div>
          {error ? (
            <div className="state-box error"><h3>Couldn’t reach the catalogue</h3><p>{error}</p></div>
          ) : (
            <div data-mascot-landmark="card" data-mascot-id="trending-grid" data-mascot-priority="5">
              <AnimeGrid items={items.slice(0, 24)} trackBehaviour shelf="home_trending" source="candidate_pool" />
            </div>
          )}
        </section>
        <SessionQuietNote />
      </section>
    </main>
  );
}
