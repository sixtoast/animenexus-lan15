import Link from "next/link";
import { AnimeGrid } from "@/components/AnimeGrid";
import { TonightIntentPanel } from "@/components/TonightIntentPanel";
import { DiscoveryShelves } from "@/components/DiscoveryShelves";
import { AvailableNowStrip } from "@/components/AvailableNowStrip";
import { HomePrimaryMoment } from "@/components/HomePrimaryMoment";
import { QuoteBanner } from "@/components/QuoteBanner";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { SessionQuietNote } from "@/components/SessionQuietNote";
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

  const hero = items[0];
  const feature = items.slice(1, 7);

  return (
    <main className="nexus-home">
      <section className="nexus-opening" data-mascot-landmark="hero" data-mascot-id="home-hero" data-mascot-priority="2">
        {hero?.image ? <div className="nexus-opening-bg" aria-hidden style={{ backgroundImage: `url("${hero.image}")` }} /> : null}
        <div className="nexus-opening-wash" aria-hidden />
        <div className="container nexus-opening-inner">
          <div className="nexus-opening-top">
            <span>01 / DISCOVERY DESK</span>
            <span>ANIMENEXUS · LANTERN</span>
            <span>EST. 2026</span>
          </div>
          <div className="nexus-opening-copy">
            <p className="nexus-kicker">Tonight, something worth watching</p>
            <h1>Stories<br /><em>without</em><br />the noise.</h1>
            <p className="nexus-opening-lead">A living anime archive shaped by your taste, your watchlist and the feeling you are looking for next.</p>
            <div className="nexus-opening-actions">
              <Link href={hero ? `/anime/${hero.id}` : "/browse"} className="nexus-button nexus-button--solid">
                Enter the story <span>↗</span>
              </Link>
              <Link href="/browse" className="nexus-button">Browse the archive</Link>
            </div>
          </div>
          {hero ? (
            <Link href={`/anime/${hero.id}`} className="nexus-opening-subject" aria-label={`Open featured title ${hero.title}`}>
              <div className="nexus-opening-subject-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero.image} alt="" />
              </div>
              <div className="nexus-opening-subject-info">
                <span>FEATURED SIGNAL</span>
                <strong>{hero.title}</strong>
                <small>{hero.year || "—"} · {hero.format || "SERIES"} · ★ {hero.score > 0 ? hero.score.toFixed(1) : "—"}</small>
              </div>
            </Link>
          ) : null}
          <div className="nexus-opening-scroll" aria-hidden><span>Scroll to explore</span><i /></div>
        </div>
      </section>

      <section className="container nexus-intent-band">
        <div className="nexus-band-label">02 / YOUR FREQUENCY</div>
        <div className="nexus-intent-layout">
          <div>
            <h2>Tell Lantern<br /><em>what tonight feels like.</em></h2>
            <p>Skip the endless scrolling. Describe the mood, the pace or the kind of story you want.</p>
          </div>
          <TonightIntentPanel compact />
        </div>
      </section>

      <section className="container nexus-primary-band">
        <div className="nexus-band-label">03 / PERSONAL SIGNAL</div>
        <HomePrimaryMoment candidates={items} />
      </section>

      <section className="nexus-index">
        <div className="container">
          <div className="nexus-section-heading">
            <div><span>04 / THE INDEX</span><h2>Worth a closer look.</h2></div>
            <Link href="/browse">View full archive ↗</Link>
          </div>
          <div className="nexus-feature-field">
            {feature.map((a, i) => (
              <Link key={a.id} href={`/anime/${a.id}`} className={`nexus-index-card nexus-index-card--${i + 1}`}>
                <div className="nexus-index-art">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.image} alt="" loading={i < 3 ? "eager" : "lazy"} />
                  <span>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="nexus-index-meta"><strong>{a.title}</strong><small>{a.year || "—"} · ★ {a.score > 0 ? a.score.toFixed(1) : "—"}</small></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container nexus-rails">
        <DiscoveryShelves candidates={items} />
        <AvailableNowStrip candidates={items} />
      </section>

      <section className="container nexus-catalog">
        <div className="nexus-section-heading">
          <div><span>05 / THE CATALOGUE</span><h2>Keep looking.</h2></div>
          <ViewModeToggle />
        </div>
        {error ? (
          <div className="state-box error"><h3>Couldn’t reach the catalogue</h3><p>{error}</p></div>
        ) : (
          <div data-mascot-landmark="card" data-mascot-id="trending-grid" data-mascot-priority="5">
            <AnimeGrid items={items.slice(0, 18)} trackBehaviour shelf="home_trending" source="candidate_pool" />
          </div>
        )}
        <p className="nexus-catalog-foot">{items.length} signals loaded · {poolVersion} · <Link href="/browse">Open the complete archive ↗</Link></p>
      </section>

      <section className="container nexus-quote"><QuoteBanner /></section>
      <SessionQuietNote />
    </main>
  );
}
