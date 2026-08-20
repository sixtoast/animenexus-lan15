import { RadarClient } from "@/components/RadarClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";
import "../stats/stats.css";
import "./radar.css";

export const metadata = {
  title: "Radar · AnimeNexus",
  description:
    "Scan the horizon for upcoming anime — signal, identify, then results.",
};

export default function Page() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · instrument</div>
          <h1>
            <span>Radar</span>
          </h1>
          <p>
            Scan → signal → identify → result. Upcoming titles from AniList,
            soft-ranked to your shelf when you have one.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Radar">
          <RadarClient />
        </DeskShell>
      </section>
    </main>
  );
}
