import type { Metadata } from "next";
import { JourneyClient } from "@/components/JourneyClient";
import "../home-dash.css";
import "./journey.css";

export const metadata: Metadata = {
  title: "Journey · AnimeNexus",
  description: "Your on-device AnimeNexus timeline and Lantern insights",
};

export default function JourneyPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Personal · journey</div>
          <h1>
            Your <span>path</span>
          </h1>
          <p>
            Timeline and insights from this browser’s shelf, memory, taste, and
            recommendation learning — private and evidence-based.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <JourneyClient />
      </section>
    </main>
  );
}
