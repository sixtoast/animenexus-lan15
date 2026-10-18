import Link from "next/link";
import { TonightIntentPanel } from "@/components/TonightIntentPanel";
import { DiscoveryShelves } from "@/components/DiscoveryShelves";
import { AvailableNowStrip } from "@/components/AvailableNowStrip";
import { HomePrimaryMoment } from "@/components/HomePrimaryMoment";
import { QuoteBanner } from "@/components/QuoteBanner";
import { NexusWorlds } from "@/components/NexusWorlds";
import { NexusArchive } from "@/components/NexusArchive";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { SessionQuietNote } from "@/components/SessionQuietNote";
import { CinemaMotion } from "@/components/CinemaMotion";
import { HomeInteractionLayer } from "@/components/HomeInteractionLayer";
import { HomeFeaturedSignal } from "@/components/HomeFeaturedSignal";
import { HomePersonalizedIndex, HomeBeyondObvious } from "@/components/HomePersonalizedIndex";
import { HomePersonalizedProvider } from "@/lib/use-home-personalized-pool";
import { generateCandidatePool, poolToAnimeList } from "@/lib/recommend-candidates";
import "./mood-home.css";
import "./home-dash.css";
import "./home-v2.css";
import "./tonight-desk.css";
import "./cold-start.css";
import "./cinema-motion-v4.css";
import "./home-masterpiece.css";
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

  const hero = items[0];

  return (
    <HomePersonalizedProvider initial={items}>
    <main className="nexus-home">
      <CinemaMotion />
      <HomeInteractionLayer />
      <section className="nexus-opening" data-mascot-landmark="hero" data-mascot-id="home-hero" data-mascot-priority="2">
        {hero?.image ? <div className="nexus-opening-bg" aria-hidden style={{ backgroundImage: `url("${hero.image}")` }} /> : null}
        <div className="nexus-opening-wash" aria-hidden />
        <div className="container nexus-opening-inner">
          <div className="nexus-opening-top">
            <span>ANIMENEXUS</span>
            <span>ANIME DISCOVERY</span>
            <span>01 / HOME</span>
          </div>
          <div className="nexus-opening-copy">
            <p className="nexus-kicker">A more considered way to discover anime</p>
            <h1>Find your<br /><em>next anime.</em></h1>
            <p className="nexus-opening-lead">Explore recommendations, seasonal releases and a catalogue shaped around what you enjoy.</p>
            <div className="nexus-opening-actions">
              <Link href="/browse" className="nexus-button nexus-button--solid">Explore anime <span>↗</span></Link>
              <Link href="#mood" className="nexus-button">Choose by mood</Link>
            </div>
          </div>
          <HomeFeaturedSignal candidates={items} />
          <div className="nexus-opening-rail" aria-hidden>
            <span className="nexus-opening-rail-label">DISCOVERY FIELD</span>
            <i />
            <span className="nexus-opening-rail-count">01 — 06</span>
          </div>
          <div className="nexus-opening-signal" aria-label="Discovery status">
            <span>CATALOGUE</span>
            <span>{items.length || 0} TITLES LOADED</span>
            <span>EXPLORE BY MOOD OR RECOMMENDATION</span>
          </div>
          <div className="nexus-opening-scroll" aria-hidden><span>Scroll to explore</span><i /></div>
        </div>
      </section>

      <div className="nexus-scene-divider nexus-scene-divider--signal" aria-hidden><span>02</span><i /></div>

      <section id="mood" className="container nexus-intent-band">
        <div className="nexus-band-label">02 / FIND BY MOOD</div>
        <div className="nexus-intent-layout">
          <div>
            <h2>What are you<br /><em>in the mood for?</em></h2>
            <p>Start with a feeling, a pace or the kind of story you want. Narrow the choices without losing the joy of discovery.</p>
          </div>
          <TonightIntentPanel compact />
        </div>
      </section>

      <div className="nexus-scene-divider nexus-scene-divider--desk" aria-hidden><span>03</span><i /></div>

      <section className="container nexus-primary-band" data-field-count={items.length}>
        <div className="nexus-band-label">03 / RECOMMENDED FOR YOU</div>
        <HomePrimaryMoment candidates={items} />
      </section>

      <div className="nexus-scene-divider nexus-scene-divider--worlds" aria-hidden><span>04</span><i /></div>

      <section className="container nexus-worlds-section">
        <div className="nexus-worlds-heading">
          <div>
            <span>04 / EXPAND YOUR TASTE</span>
            <h2>One step<br /><em>off the usual path.</em></h2>
          </div>
          <p>Discover nearby genres and new favourites, with recommendations connected to the anime you already enjoy.</p>
        </div>
        <NexusWorlds candidates={items} />
      </section>

      <div className="nexus-scene-divider nexus-scene-divider--index" aria-hidden><span>05</span><i /></div>

      <section className="nexus-index">
        <div className="container">
          <div className="nexus-section-heading">
            <div><span>05 / SELECTED ANIME</span><h2>Worth your time.</h2></div>
            <Link href="/browse">View full archive ↗</Link>
          </div>
          <HomePersonalizedIndex candidates={items} />
        </div>
      </section>

      <HomeBeyondObvious candidates={items} />

      <section className="container nexus-rails">
        <DiscoveryShelves candidates={items} />
        <AvailableNowStrip candidates={items} />
      </section>

      <div className="nexus-scene-divider nexus-scene-divider--archive" aria-hidden><span>06</span><i /></div>

      <section className="container nexus-catalog">
        <div className="nexus-section-heading">
          <div><span>06 / THE CATALOGUE</span><h2>Explore the catalogue.</h2></div>
          <ViewModeToggle />
        </div>
        {error ? (
          <div className="state-box error"><h3>Couldn’t reach the catalogue</h3><p>{error}</p></div>
        ) : (
          <div data-mascot-landmark="card" data-mascot-id="trending-grid" data-mascot-priority="5">
            <NexusArchive items={items} />
          </div>
        )}
        <p className="nexus-catalog-foot">{items.length} signals loaded · {poolVersion} · <Link href="/browse">Open the complete archive ↗</Link></p>
      </section>

      <section className="container nexus-quote"><QuoteBanner /></section>
      <SessionQuietNote />
    </main>
    </HomePersonalizedProvider>
  );
}
