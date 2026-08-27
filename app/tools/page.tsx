import Link from "next/link";
import "./tools.css";
import "../desk.css";
import { toolPersonality, type ToolPersonalityId } from "@/lib/tool-personality";

export const metadata = {
  title: "Tools · AnimeNexus",
  description: "Compare, fusion, radar, oracle, stats, fanzone, and more.",
};

const TOOLS: {
  href: string;
  emoji: string;
  title: string;
  blurb: string;
  personality: ToolPersonalityId;
}[] = [
  { href: "/tools/tonight", emoji: "🌙", title: "Tonight", blurb: "Minutes left → shelf that fits.", personality: "generic" },
  { href: "/tools/compare", emoji: "⚖️", title: "Compare", blurb: "Two titles side by side.", personality: "compare" },
  { href: "/tools/fusion", emoji: "🧬", title: "Fusion", blurb: "Blend two signals + catalog children.", personality: "fusion" },
  { href: "/tools/dislike", emoji: "🙅", title: "Dislike reverse", blurb: "Opposite genre space.", personality: "dislike" },
  { href: "/tools/completionist", emoji: "✅", title: "Completionist", blurb: "Finish Watching, rank Planning.", personality: "completionist" },
  { href: "/tools/radar", emoji: "📡", title: "Radar", blurb: "Upcoming scanner + prefs.", personality: "radar" },
  { href: "/tools/signals", emoji: "🔔", title: "Signals", blurb: "Local inbox of soft changes.", personality: "radar" },
  { href: "/tools/status", emoji: "🩺", title: "Status", blurb: "Optional API gates · soft-fail.", personality: "generic" },
  { href: "/tools/stats", emoji: "📊", title: "Stats", blurb: "Year-in-anime editorial.", personality: "stats" },
  { href: "/tools/challenge", emoji: "🎯", title: "Challenge", blurb: "Silhouette daily MCQ.", personality: "challenge" },
  { href: "/tools/sauce", emoji: "🔍", title: "Sauce", blurb: "Drop, paste, URL → trace.moe.", personality: "sauce" },
  { href: "/tools/oracle", emoji: "🕯️", title: "Night Desk", blurb: "Local + cloud oracle.", personality: "oracle" },
  { href: "/tools/fanzone", emoji: "💌", title: "Fan zone", blurb: "Bingo, confessions, Taste DNA.", personality: "fanzone" },
  { href: "/tools/motion", emoji: "🎬", title: "Motion", blurb: "Clip room (honest scaffold).", personality: "motion" },
  { href: "/airing", emoji: "📺", title: "Airing", blurb: "Schedule + releasing now.", personality: "generic" },
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
          <p>
            Same shell — different personalities. Instrument, broadcast, game,
            archive, investigation, studio.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <div className="desk-band">
          <span>
            <strong>Lantern</strong> · pick an instrument
          </span>
          <Link href="/">← Home</Link>
        </div>
        <div className="tools-hub">
          {TOOLS.map((t, i) => {
            const p = toolPersonality(t.personality);
            return (
              <Link
                key={t.href}
                href={t.href}
                className="tools-hub-card"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="tools-hub-emoji">{t.emoji}</span>
                <h2>{t.title}</h2>
                <p>{t.blurb}</p>
                <span className="tools-hub-role">{p.role}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
