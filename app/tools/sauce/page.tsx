import { SauceClient } from "@/components/SauceClient";
import { DeskShell } from "@/components/DeskShell";
import "../tools.css";
import "./sauce.css";

export const metadata = {
  title: "Sauce · AnimeNexus",
  description: "Drop, paste, or URL → scene search.",
};

export default function Page() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · Sauce</div>
          <h1>Sauce</h1>
          <p>Drop, paste, or URL — trace the frame.</p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Sauce">
          <SauceClient />
        </DeskShell>
      </section>
    </main>
  );
}
