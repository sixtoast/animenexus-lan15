"use client";

import Link from "next/link";
import { useHomePersonalization } from "@/components/HomePersonalization";

export function HomeIndex() {
  const { items, surprise } = useHomePersonalization();
  const feature = items.slice(0, 6);
  const cut = feature[0] || surprise[0];

  return (
    <>
      <section className="nexus-index">
        <div className="container">
          <div className="nexus-section-heading">
            <div><span>05 / THE INDEX</span><h2>Worth a closer look.</h2></div>
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

      <div className="nexus-index-cut" style={cut?.image ? { backgroundImage: `linear-gradient(90deg, rgba(7,8,11,.94), rgba(7,8,11,.58) 45%, rgba(7,8,11,.86)), url("${cut.image}")` } : undefined}>
        <span>THE INDEX</span>
        <strong>BEYOND<br />THE OBVIOUS.</strong>
        {cut ? <Link href={`/anime/${cut.id}`} className="nexus-index-cut-link"><span>Continue with</span><strong>{cut.title}</strong><i>Open title ↗</i></Link> : null}
      </div>
    </>
  );
}
