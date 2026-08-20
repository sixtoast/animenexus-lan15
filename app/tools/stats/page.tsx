import { StatsClient } from "@/components/StatsClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";
import "./stats.css";

export const metadata = {
  title: "Stats · AnimeNexus",
  description:
    "Your year in anime — stories, hours, and shelf shape from this browser.",
};

export default function Page() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · editorial</div>
          <h1>
            Your year in <span>anime</span>
          </h1>
          <p>
            Not a chart dump — a short report from this browser’s shelf: stories,
            time, completion, and the signals that stood out.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Stats" personality="stats">
          <StatsClient />
        </DeskShell>
      </section>
    </main>
  );
}
