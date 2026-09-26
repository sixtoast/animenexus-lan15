"use client";

import Link from "next/link";
import { useHomePersonalization } from "@/components/HomePersonalization";

export function HomeOpening() {
  const { items, surprise, ready } = useHomePersonalization();
  const hero = items[0] || surprise[0];
  const signals = surprise.slice(0, 6);

  return (
    <section className="nexus-opening" data-mascot-landmark="hero" data-mascot-id="home-hero" data-mascot-priority="2">
      {hero?.image ? <div className="nexus-opening-bg" aria-hidden style={{ backgroundImage: `url("${hero.image}")` }} /> : null}
      <div className="nexus-opening-wash" aria-hidden />
      <div className="container nexus-opening-inner">
        <div className="nexus-opening-top">
          <span>01 / DISCOVERY DESK</span><span>ANIMENEXUS · LANTERN</span><span>EST. 2026</span>
        </div>
        <div className="nexus-opening-copy">
          <p className="nexus-kicker">Tonight, something worth watching</p>
          <h1>Stories<br /><em>without</em><br />the noise.</h1>
          <p className="nexus-opening-lead">A living anime archive shaped by your taste, your watchlist and the feeling you are looking for next.</p>
          <div className="nexus-opening-actions">
            <Link href={hero ? `/anime/${hero.id}` : "/browse"} className="nexus-button nexus-button--solid">Enter the story <span>↗</span></Link>
            <Link href="/browse" className="nexus-button">Browse the archive</Link>
          </div>
        </div>
        {hero ? (
          <Link href={`/anime/${hero.id}`} className="nexus-opening-subject" aria-label={`Open featured title ${hero.title}`}>
            <div className="nexus-opening-subject-image">
              <div className="nexus-opening-subject-backplate" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="nexus-opening-subject-echo" src={hero.image} alt="" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.image} alt="" />
            </div>
            <div className="nexus-opening-subject-info">
              <span>FEATURED SIGNAL · {ready ? "PERSONALISED" : "LOADING"}</span>
              <strong>{hero.title}</strong>
              <small>{hero.year || "—"} · {hero.format || "SERIES"} · ★ {hero.score > 0 ? hero.score.toFixed(1) : "—"}</small>
            </div>
          </Link>
        ) : null}
        <div className="nexus-opening-rail" aria-hidden><span className="nexus-opening-rail-label">SURPRISE FIELD</span><i /><span className="nexus-opening-rail-count">{String(Math.min(6, signals.length)).padStart(2,"0")} SIGNALS</span></div>
        <div className="nexus-opening-signal" aria-label="Discovery status">
          <span><b>LIVE</b> / CATALOGUE</span><span>{items.length || 0} PERSONAL SIGNALS</span><span>{surprise.length || 0} SURPRISE PATHS</span>
        </div>
        <div className="nexus-opening-scroll" aria-hidden><span>Scroll to explore</span><i /></div>
      </div>
    </section>
  );
}
