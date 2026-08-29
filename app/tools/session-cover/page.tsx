import { SessionCoverStudio } from "@/components/SessionCoverStudio";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";

export const metadata = {
  title: "Session Cover · AnimeNexus",
  description:
    "Generate editorial AnimeNexus session covers from your local shelf",
};

export default function SessionCoverPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Share · visual</div>
          <h1>
            Session <span>Cover</span>
          </h1>
          <p>
            Curated compositions from this browser’s seals — portrait, square,
            landscape, or Open Graph size. Private until you download.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Session Cover" personality="sauce">
          <SessionCoverStudio />
        </DeskShell>
      </section>
    </main>
  );
}
