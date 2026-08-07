import { fetchDailyPool } from "@/lib/anilist-discover";
import { dailySeed, pickIndex } from "@/lib/season";
import { DailyRitual } from "@/components/DailyRitual";
import type { Metadata } from "next";
import "./daily.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daily pick · AnimeNexus",
  description: "One title for today — Lantern’s daily signal until midnight.",
};

export default async function DailyPage() {
  const seed = dailySeed();
  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  let error: string | null = null;
  let anime = null as Awaited<
    ReturnType<typeof fetchDailyPool>
  >[number] | null;

  try {
    const pool = await fetchDailyPool(48);
    if (pool.length) {
      anime = pool[pickIndex(seed, pool.length)] || null;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load daily pool";
  }

  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Lantern · daily frequency</div>
          <h1>
            Tonight’s <span>signal</span>
          </h1>
          <p>
            One title, locked for {dateLabel}. Same seed all day — refresh won’t
            change it. Lantern keeps the channel steady.
          </p>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 48 }}>
        {error ? (
          <div className="state-box error lantern-empty">
            <h3>Signal interrupted</h3>
            <p>{error}</p>
          </div>
        ) : !anime ? (
          <div className="state-box lantern-empty">
            <h3>No pick on the desk</h3>
            <p>The pool came back empty. Try again in a moment.</p>
          </div>
        ) : (
          <DailyRitual anime={anime} dateLabel={dateLabel} />
        )}
      </section>
    </main>
  );
}
