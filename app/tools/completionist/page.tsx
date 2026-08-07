import { CompletionistClient } from "@/components/CompletionistClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";

export const metadata = { title: "Completionist · AnimeNexus" };

export default function Page() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · Completionist</div>
          <h1>Completionist</h1>
          <p>Finish Watching, rank Planning.</p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Completionist">
          <CompletionistClient />
        </DeskShell>
      </section>
    </main>
  );
}
