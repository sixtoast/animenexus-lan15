import { ChallengeClient } from "@/components/ChallengeClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";

export const metadata = { title: "Challenge · AnimeNexus" };

export default function ChallengePage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · Challenge</div>
          <h1>Challenge</h1>
          <p>Silhouette daily — art dissolves when you lock in.</p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Challenge">
          <ChallengeClient />
        </DeskShell>
      </section>
    </main>
  );
}
