import { OracleClient } from "@/components/OracleClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";
import "../../oracle-vibe.css";

export const metadata = {
  title: "Night Desk · AnimeNexus",
  description:
    "Lantern’s Night Desk — Tonight’s Pick, What-If, Letter, Taste Mirror, Marathon, Vibe Cast.",
};

export default function OraclePage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Lantern · broadcast</div>
          <h1>
            Night <span>Desk</span>
          </h1>
          <p>
            Tune a frequency — Tonight’s Pick, What-If, Character Note, Taste
            Mirror, Marathon Plan, or Vibe Cast. Local readings stay on-device;
            cloud needs your key.
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
