import { OracleClient } from "@/components/OracleClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";
import "../../oracle-vibe.css";

export const metadata = {
  title: "Night Desk · AnimeNexus",
  description: "Lantern’s local + cloud readings — what to watch, why, and how.",
};

export default function OraclePage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Lantern · Night Desk</div>
          <h1>
            Night <span>Desk</span>
          </h1>
          <p>
            Ask Lantern for a pick, a letter, a marathon — or a local reading
            that never leaves this browser.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Oracle">
          <OracleClient />
        </DeskShell>
      </section>
    </main>
  );
}
