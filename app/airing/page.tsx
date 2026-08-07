import Link from "next/link";
import { fetchAiring, fetchAiringSchedule } from "@/lib/anilist-discover";
import { AnimeCard } from "@/components/AnimeCard";
import "./airing.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Airing · AnimeNexus",
  description: "Currently releasing and upcoming episode schedule.",
};

function formatAir(ts: number) {
  try {
    return new Date(ts * 1000).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(ts);
  }
}

export default async function AiringPage() {
  let popular;
  let schedule: Awaited<ReturnType<typeof fetchAiringSchedule>> = [];
  try {
    popular = await fetchAiring(1, 24);
  } catch {
    popular = { data: [], pagination: { total: 0, hasNextPage: false } };
  }
  try {
    schedule = await fetchAiringSchedule(72);
  } catch {
    schedule = [];
  }

  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Live signal</div>
          <h1>
            Currently <span>airing</span>
          </h1>
          <p>
            Popular releasing titles and the next ~72 hours of episode drops.
          </p>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 32 }}>
        <h2 className="section-title">Upcoming episodes</h2>
        {schedule.length === 0 ? (
          <p className="tools-hint">Schedule quiet or unreachable.</p>
        ) : (
          <ul className="airing-schedule">
            {schedule.slice(0, 40).map((row) => (
              <li key={`${row.media.id}-${row.episode}-${row.airingAt}`}>
                <Link href={`/anime/${row.media.id}`} className="airing-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.media.image} alt="" />
                  <div>
                    <div className="airing-title">{row.media.title}</div>
                    <div className="airing-meta">
                      Ep {row.episode} · {formatAir(row.airingAt)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="container" style={{ paddingBottom: 48 }}>
        <h2 className="section-title">Popular releasing</h2>
        {popular.data.length === 0 ? (
          <p className="tools-hint">No airing data.</p>
        ) : (
          <div className="anime-grid">
            {popular.data.map((a) => (
              <AnimeCard key={a.id} anime={a} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
