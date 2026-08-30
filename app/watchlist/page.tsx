import "./watchlist.css";
import "../watchlist-queue.css";
import { WatchlistClient } from "@/components/WatchlistClient";
import { OnboardingTip } from "@/components/OnboardingTips";

export const metadata = {
  title: "Watchlist · AnimeNexus",
  description:
    "Your local AnimeNexus watchlist — living queue, planning, watching, completed.",
};

export default function WatchlistPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Watchlist · living queue</div>
          <h1>
            Your <span>list</span>
          </h1>
          <p>
            Stored in this browser only. Resume in-progress titles, clear stale
            plans, and track status here.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <OnboardingTip feature="seal" />
        <WatchlistClient />
      </section>
    </main>
  );
}
