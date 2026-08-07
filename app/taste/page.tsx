import { TasteClient } from "@/components/TasteClient";
import "./taste.css";

export const metadata = {
  title: "Taste · AnimeNexus",
  description:
    "How you watch — Lantern’s portrait of your local shelf, not only numbers.",
};

export default function TastePage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Lantern · taste frequency</div>
          <h1>
            Your <span>signal</span>
          </h1>
          <p>
            Not a dashboard of vanity metrics — a portrait of how you seal,
            finish, and wander. Built from this browser’s watchlist and what
            Lantern remembers.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <TasteClient />
      </section>
    </main>
  );
}
