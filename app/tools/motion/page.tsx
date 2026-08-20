import { MotionClient } from "@/components/MotionClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";

export const metadata = {
  title: "Motion · AnimeNexus",
  description: "Clip room — samples and URL preview.",
};

export default function Page() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · studio</div>
          <h1>Motion</h1>
          <p>Clip room — samples and URL preview. No fake upscale.</p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Motion" personality="motion">
          <MotionClient />
        </DeskShell>
      </section>
    </main>
  );
}
