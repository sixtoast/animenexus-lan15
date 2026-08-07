import "./watchlist.css";
import { WatchlistClient } from "@/components/WatchlistClient";

export const metadata = {
  title: "Watchlist · AnimeNexus",
  description: "Your local AnimeNexus watchlist — planning, watching, completed.",
};

export default function WatchlistPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Watchlist · Sprint 4</div>
          <h1>
            Your <span>list</span>
          </h1>
          <p>
            Stored in this browser only. Add titles from any detail page, then
            track status, progress, and your score here.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <WatchlistClient />
      </section>
    </main>
  );
}
