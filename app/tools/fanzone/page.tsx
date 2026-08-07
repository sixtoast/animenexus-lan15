import { FanzoneClient } from "@/components/FanzoneClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";
import "./../fanzone.css";

export const metadata = {
  title: "Fan zone · AnimeNexus",
  description: "Bingo, confessions, Taste DNA compare.",
};

export default function Page() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · Fan zone</div>
          <h1>Fan zone</h1>
          <p>Bingo board, local confessions, Taste DNA.</p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Fan zone">
          <FanzoneClient />
        </DeskShell>
      </section>
    </main>
  );
}
