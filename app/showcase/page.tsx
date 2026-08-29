import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Showcase sequence · AnimeNexus",
  description:
    "Guided path through real AnimeNexus creative surfaces — not a mock showreel.",
  robots: { index: false, follow: false },
};

const STEPS: {
  n: number;
  title: string;
  blurb: string;
  href: string;
  stack: string;
}[] = [
  {
    n: 1,
    title: "Lantern signal",
    blurb: "Meet Lantern-ko on the desk — mascot presence is live site chrome.",
    href: "/",
    stack: "R3F · procedural motion",
  },
  {
    n: 2,
    title: "Card → detail",
    blurb: "Open any title; view transitions carry you into the detail stage.",
    href: "/browse",
    stack: "View Transitions · CSS",
  },
  {
    n: 3,
    title: "Living Shelf",
    blurb: "Watchlist → Shelf mode for the spatial archive (WebGL when allowed).",
    href: "/watchlist",
    stack: "R3F Living Shelf",
  },
  {
    n: 4,
    title: "Shelf sound",
    blurb: "Enable Sound Settings, then select titles — settle and spatial cues.",
    href: "/tools",
    stack: "SFX · spatial audio",
  },
  {
    n: 5,
    title: "Resonance pair",
    blurb: "On the shelf: select one, press C, select another — resonance panel + tone.",
    href: "/watchlist",
    stack: "Resonance · SFX",
  },
  {
    n: 6,
    title: "Memory",
    blurb: "Detail views feed Lantern memory; open a title you’ve been with.",
    href: "/browse",
    stack: "Memory visit",
  },
  {
    n: 7,
    title: "Session Cover",
    blurb: "Build an editorial share card from your shelf — owned media path.",
    href: "/tools/session-cover",
    stack: "Canvas · optional Cloudinary",
  },
  {
    n: 8,
    title: "Back to product",
    blurb: "Night Desk, Radar, Oracle — the same site, no demo mode exit reel.",
    href: "/tools",
    stack: "Full product",
  },
];

export default function ShowcasePage() {
  return (
    <main className="container page-main showcase-page">
      <header className="page-header">
        <p className="eyebrow">Creative · Awwwards sequence</p>
        <h1>Showcase path</h1>
        <p className="lede">
          Ordered stops through <strong>real</strong> AnimeNexus surfaces. Nothing
          here is a mock player or silent shelf inject. Follow the links in order
          for a cohesive creative reading.
        </p>
      </header>

      <ol className="showcase-steps">
        {STEPS.map((s) => (
          <li key={s.n} className="showcase-step">
            <span className="showcase-step-n" aria-hidden>
              {String(s.n).padStart(2, "0")}
            </span>
            <div className="showcase-step-body">
              <h2 className="showcase-step-title">{s.title}</h2>
              <p className="showcase-step-blurb">{s.blurb}</p>
              <p className="tools-hint">{s.stack}</p>
              <Link href={s.href} className="btn btn-outline btn-sm">
                Open
              </Link>
            </div>
          </li>
        ))}
      </ol>

      <p className="tools-hint" style={{ marginTop: 24 }}>
        Operators: turn on Sound Settings before shelf steps. Prefer a FULL
        creative-tier device for WebGL. See{" "}
        <code>docs/SHOWCASE_SEQUENCE.md</code>.
      </p>
    </main>
  );
}
