import Link from "next/link";
import type { Metadata } from "next";
import { MOODS } from "@/lib/moods";
import { MoodChips } from "@/components/MoodChips";
import "./mood.css";

export const metadata: Metadata = {
  title: "Tonight · moods · AnimeNexus",
  description:
    "Pick a viewing intent for tonight — Lantern steers ranking from how you want to feel.",
};

export default function MoodIndexPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 16 }}>
        <div className="container">
          <div className="hero-badge">Viewing intent</div>
          <h1>
            What kind of night · <span>pick a mood</span>
          </h1>
          <p>
            Tell Lantern how you want to feel. Intent steers ranking — it is not
            a genre filter alone.
          </p>
          <div style={{ marginTop: 20 }}>
            <MoodChips />
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 48 }}>
        <div className="section-head">
          <h2>All intents</h2>
          <span className="meta">{MOODS.length} experiences</span>
        </div>
        <ul className="mood-index-grid">
          {MOODS.map((m) => (
            <li key={m.slug}>
              <Link href={`/mood/${m.slug}`} className="mood-index-card">
                <span className="mood-index-emoji" aria-hidden>
                  {m.emoji}
                </span>
                <span className="mood-index-label">{m.label}</span>
                <span className="mood-index-blurb">{m.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="meta" style={{ marginTop: 24 }}>
          Or open <Link href="/">Home</Link> and set dials on Tonight Intent
          without picking a named mood.
        </p>
      </section>
    </main>
  );
}
