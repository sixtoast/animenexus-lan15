import Link from "next/link";
import "./tools.css";
import "../desk.css";

export const metadata = {
  title: "Tools · AnimeNexus",
  description: "Compare, fusion, radar, oracle, stats, fanzone, and more.",
};

const TOOLS = [
  { href: "/tools/compare", emoji: "⚖️", title: "Compare", blurb: "Two titles side by side." },
  { href: "/tools/fusion", emoji: "🧬", title: "Fusion", blurb: "Blend two signals + catalog children." },
  { href: "/tools/dislike", emoji: "🙅", title: "Dislike reverse", blurb: "Opposite genre space." },
  { href: "/tools/completionist", emoji: "✅", title: "Completionist", blurb: "Finish Watching, rank Planning." },
  { href: "/tools/radar", emoji: "📡", title: "Radar", blurb: "Upcoming scanner + prefs." },
  { href: "/tools/stats", emoji: "📊", title: "Stats", blurb: "Watchlist analytics." },
  { href: "/tools/challenge", emoji: "🎯", title: "Challenge", blurb: "Silhouette daily MCQ." },
  { href: "/tools/sauce", emoji: "🔍", title: "Sauce", blurb: "Drop, paste, URL → trace.moe." },
  { href: "/tools/oracle", emoji: "🕯️", title: "Night Desk", blurb: "Local + cloud oracle." },
  { href: "/tools/fanzone", emoji: "💌", title: "Fan zone", blurb: "Bingo, confessions, Taste DNA." },
  { href: "/tools/motion", emoji: "🎬", title: "Motion", blurb: "Clip room (honest scaffold)." },
  { href: "/airing", emoji: "📺", title: "Airing", blurb: "Schedule + releasing now." },
];

export default function ToolsHubPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · tools</div>
          <h1>
            Desk <span>tools</span>
          </h1>
          <p>One frequency desk — fusion, radar, stats, fan zone, sauce, oracle, motion.</p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <div className="desk-band">
          <span>
            <strong>Lantern</strong> · pick a instrument
          </span>
          <Link href="/">← Home</Link>
        </div>
        <div className="tools-hub">
          {TOOLS.map((t, i) => (
            <Link
              key={t.href}
              href={t.href}
              className="tools-hub-card"
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className="tools-hub-emoji">{t.emoji}</span>
              <h2>{t.title}</h2>
              <p>{t.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
