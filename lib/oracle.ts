import type { WatchlistEntry } from "./types";
import { MOODS } from "./moods";
import { readMemory } from "./lantern-memory";

export type OracleReading = {
  headline: string;
  body: string;
  moodSlug?: string;
  moodLabel?: string;
};

/** Local Lantern reading — on-device, memory-aware */
export function consultOracle(entries: WatchlistEntry[]): OracleReading {
  const n = entries.length;
  const mem =
    typeof window !== "undefined"
      ? readMemory()
      : {
          recentViews: [] as { title: string }[],
          completedLog: [] as { title: string }[],
          genreCounts: {} as Record<string, number>,
        };

  if (n === 0) {
    const recent = mem.recentViews[0];
    if (recent) {
      return {
        headline: "The shelf is empty — the signal isn’t",
        body: `You were looking at “${recent.title}” but nothing is sealed yet. Open that detail and add it, or accept the daily signal. Lantern needs a list to reflect.`,
        moodSlug: "chill",
        moodLabel: "Chill",
      };
    }
    return {
      headline: "The desk is quiet",
      body: "Your list is empty. Open Browse or Daily, seal a few titles, then return — the signal needs something to reflect.",
      moodSlug: "chill",
      moodLabel: "Chill",
    };
  }

  const watching = entries.filter((e) => e.watchStatus === "watching");
  const planning = entries.filter((e) => e.watchStatus === "planning");
  const completed = entries.filter((e) => e.watchStatus === "completed");
  const hours =
    entries.reduce((sum, e) => {
      const dur = e.duration && e.duration > 0 ? e.duration : 24;
      return sum + Math.max(0, e.progress || 0) * dur;
    }, 0) / 60;

  if (watching.length > 0) {
    const top = [...watching].sort((a, b) => b.progress - a.progress)[0];
    return {
      headline: "Stay on the current frequency",
      body: `You’re mid-signal on “${top.title}” (${top.progress} ep logged). Lantern says: one more session before opening a new channel. You’ve tracked ~${hours.toFixed(1)} hours total.`,
      moodSlug: "hype",
      moodLabel: "Hype",
    };
  }

  if (mem.completedLog[0] && planning.length === 0) {
    return {
      headline: "After the close",
      body: `You recently finished “${mem.completedLog[0].title}”. The shelf has room again. Browse a mood or accept today’s daily signal before the queue rebuilds.`,
      moodSlug: "chill",
      moodLabel: "Chill",
    };
  }

  if (planning.length >= 3) {
    const pick =
      planning[Math.floor(Math.random() * Math.min(planning.length, 5))];
    return {
      headline: "The queue is stacking",
      body: `${planning.length} titles wait in Planning. Tonight’s draw from the stack: “${pick.title}”. Move it to Watching and log the first episode.`,
      moodSlug: "chill",
      moodLabel: "Chill",
    };
  }

  if (completed.length > 0 && planning.length === 0) {
    const mood = MOODS[Math.floor(Math.random() * MOODS.length)];
    return {
      headline: "Between seasons",
      body: `You’ve closed ${completed.length} titles. Try a mood feed — ${mood.emoji} ${mood.label}: ${mood.blurb}`,
      moodSlug: mood.slug,
      moodLabel: mood.label,
    };
  }

  const rated = entries.filter((e) => e.userRating > 0);
  if (rated.length > 0) {
    const avg = rated.reduce((s, e) => s + e.userRating, 0) / rated.length;
    return {
      headline: "Your calibration",
      body: `Across ${rated.length} rated titles your average is ${avg.toFixed(1)}. ${
        avg >= 8
          ? "You run a high bar — Masterpiece mood may fit."
          : avg >= 6
            ? "Balanced palate — mix Hype and Chill."
            : "You’re open to experiments — try Mind-bender or Spooky."
      }`,
      moodSlug: avg >= 8 ? "masterpiece" : "mind",
      moodLabel: avg >= 8 ? "Masterpiece" : "Mind-bender",
    };
  }

  const topGenre = Object.entries(mem.genreCounts).sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (topGenre) {
    return {
      headline: "Genre gravity",
      body: `Browsing has been pulling toward ${topGenre[0]}. ${n} titles on the list · ~${hours.toFixed(1)} hours logged. Seal scores so Lantern can sharpen the reading.`,
      moodSlug: "fantasy",
      moodLabel: "Fantasy",
    };
  }

  return {
    headline: "Keep the lantern lit",
    body: `${n} titles on the list · ~${hours.toFixed(1)} hours logged. Add progress or scores on Watchlist so the desk can read you more clearly.`,
    moodSlug: "fantasy",
    moodLabel: "Fantasy",
  };
}
