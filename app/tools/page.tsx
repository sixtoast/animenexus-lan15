import Link from "next/link";
import "./tools.css";
import "../desk.css";
import {
  ToolsHubClient,
  OpenAiDeskButton,
  type ToolCard,
} from "@/components/ToolsHubClient";

export const metadata = {
  title: "Tools · AnimeNexus",
  description: "Compare, fusion, radar, oracle, stats, fanzone, and more.",
};

const TOOLS: ToolCard[] = [
  {
    href: "/tools/tonight",
    icon: "night-desk",
    title: "Tonight",
    blurb: "Minutes left → shelf that fits.",
    personality: "generic",
  },
  {
    href: "/tools/compare",
    icon: "compare",
    title: "Compare",
    blurb: "Two titles side by side.",
    personality: "compare",
  },
  {
    href: "/tools/fusion",
    icon: "resonance",
    title: "Fusion",
    blurb: "Blend two signals + catalog children.",
    personality: "fusion",
  },
  {
    href: "/tools/dislike",
    icon: "signal",
    title: "Dislike reverse",
    blurb: "Opposite genre space.",
    personality: "dislike",
  },
  {
    href: "/tools/completionist",
    icon: "seal",
    title: "Completionist",
    blurb: "Finish Watching, rank Planning.",
    personality: "completionist",
  },
  {
    href: "/tools/radar",
    icon: "radar",
    title: "Radar",
    blurb: "Upcoming scanner + prefs.",
    personality: "radar",
  },
  {
    href: "/tools/signals",
    icon: "signal",
    title: "Signals",
    blurb: "Local inbox of soft changes.",
    personality: "radar",
  },
  {
    href: "/tools/status",
    icon: "stats",
    title: "Status",
    blurb: "Optional API gates · soft-fail.",
    personality: "generic",
  },
  {
    href: "/tools/stats",
    icon: "stats",
    title: "Stats",
    blurb: "Year-in-anime editorial.",
    personality: "stats",
  },
  {
    href: "/tools/challenge",
    icon: "challenge",
    title: "Challenge",
    blurb: "Silhouette daily MCQ.",
    personality: "challenge",
  },
  {
    href: "/tools/sauce",
    icon: "sauce",
    title: "Sauce",
    blurb: "Drop, paste, URL → trace.moe.",
    personality: "sauce",
  },
  {
    href: "/tools/session-cover",
    icon: "living-shelf",
    title: "Session Cover",
    blurb: "Editorial share cards from your shelf.",
    personality: "generic",
  },
  {
    href: "/tools/oracle",
    icon: "oracle",
    title: "Night Desk",
    blurb: "Local + cloud oracle.",
    personality: "oracle",
  },
  {
    href: "/tools/fanzone",
    icon: "frequency",
    title: "Fan zone",
    blurb: "Bingo, confessions, Taste DNA.",
    personality: "fanzone",
  },
  {
    href: "/tools/motion",
    icon: "daily",
    title: "Motion",
    blurb: "Clip room (honest scaffold).",
    personality: "motion",
  },
  {
    href: "/airing",
    icon: "seasonal",
    title: "Airing",
    blurb: "Schedule + releasing now.",
    personality: "generic",
  },
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
            Instruments for the night — AI desk, catalog tools, and soft
            utilities.
          </p>
          <div style={{ marginTop: 16 }}>
            <OpenAiDeskButton />
          </div>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <div className="desk-band">
          <span>
            <strong>Lantern</strong> · pick an instrument
          </span>
          <Link href="/">Home</Link>
        </div>
        <ToolsHubClient tools={TOOLS} />
      </section>
    </main>
  );
}
