import { DislikeClient } from "@/components/DislikeClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";

export const metadata = { title: "Dislike reverse · AnimeNexus" };

export default function Page() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · Dislike</div>
          <h1>Dislike reverse</h1>
          <p>Opposite genre space from a seed title.</p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Dislike reverse">
          <DislikeClient />
        </DeskShell>
      </section>
    </main>
  );
}
