import { StatsClient } from "@/components/StatsClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";
import "./stats.css";

export const metadata = {
  title: "Stats · AnimeNexus",
  description: "Watchlist analytics from your local list.",
};

export default function Page() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · Stats</div>
          <h1>Stats</h1>
          <p>Hours, genres, and list shape from this browser.</p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Stats">
          <StatsClient />
        </DeskShell>
      </section>
    </main>
  );
}
