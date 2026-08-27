import type { Metadata } from "next";
import { TonightPlanner } from "@/components/TonightPlanner";
import { WeatherContextHint } from "@/components/WeatherContextHint";
import "../tools.css";

export const metadata: Metadata = {
  title: "Tonight · AnimeNexus",
  description: "Fit your shelf into the minutes you have tonight.",
};

export default function TonightPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Lantern · tonight</div>
          <h1>
            Tonight <span>planner</span>
          </h1>
          <p>
            How much time do you have? Lantern ranks watching and planning
            titles that fit — your shelf only, not a seasonal dump.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <WeatherContextHint />
        <TonightPlanner />
      </section>
    </main>
  );
}
