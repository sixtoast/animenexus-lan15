import type { Metadata } from "next";
import { DeskShell } from "@/components/DeskShell";
import { SignalsInbox } from "@/components/SignalsInbox";
import "../tools.css";

export const metadata: Metadata = {
  title: "Signals · AnimeNexus",
  description: "Local inbox of streaming and radar signals.",
};

export default function SignalsPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · inbox</div>
          <h1>
            <span>Signals</span>
          </h1>
          <p>
            Soft history of what changed — streaming providers, radar notes,
            system cues. Stored in this browser only.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Signals" personality="radar">
          <SignalsInbox />
        </DeskShell>
      </section>
    </main>
  );
}
