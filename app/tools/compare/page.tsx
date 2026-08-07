import { CompareClient } from "@/components/CompareClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";

export const metadata = { title: "Compare · AnimeNexus" };

export default function Page() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · Compare</div>
          <h1>Compare</h1>
          <p>Two titles side by side.</p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Compare">
          <CompareClient />
        </DeskShell>
      </section>
    </main>
  );
}
