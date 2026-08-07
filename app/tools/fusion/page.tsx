import { FusionClient } from "@/components/FusionClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";

export const metadata = { title: "Fusion · AnimeNexus" };

export default function Page() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · Fusion</div>
          <h1>Fusion</h1>
          <p>Blend two signals into catalog children.</p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Fusion">
          <FusionClient />
        </DeskShell>
      </section>
    </main>
  );
}
