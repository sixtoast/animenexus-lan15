import type { WatchlistEntry } from "./types";
import type { IntentSession } from "./intent-session";
import { getExperienceIntent } from "./viewing-intent";
import { MOODS } from "./moods";
import { readMemory } from "./lantern-memory";
import { buildTonightFromList } from "./tonight";
import { interactionWeight } from "./resonance";

export type OracleReading = {
  headline: string;
  body: string;
  moodSlug?: string;
  moodLabel?: string;
};

function bestWatching(entries: WatchlistEntry[]): WatchlistEntry {
  return [...entries].sort((a, b) => {
    const pw = interactionWeight(b) - interactionWeight(a);
    if (Math.abs(pw) > 0.01) return pw;
    return (b.progress || 0) - (a.progress || 0);
  })[0];
}

export function sessionAppendix(session?: IntentSession | null): string {
  if (!session) return "";
  const bits: string[] = [];
  if (session.slug) {
    const exp = getExperienceIntent(session.slug);
    bits.push(
      exp ? `Tonight lean: ${exp.label}` : `Tonight pack: ${session.slug}`,
    );
  }
  if (session.intensity && session.intensity !== "moderate") {
    bits.push(`intensity ${session.intensity}`);
  }
  if (session.energy && session.energy !== "medium") {
    bits.push(`energy ${session.energy}`);
  }
  if (session.minutesAvailable) {
    bits.push(`~${session.minutesAvailable}m window`);
  }
  return bits.length ? ` Session dials · ${bits.join(" · ")}.` : "";
}

/** Local Lantern reading — on-device, memory-aware */
export function consultOracle(
  entries: WatchlistEntry[],
  session?: IntentSession | null,
): OracleReading {
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
    const top = bestWatching(watching);
    return {
      headline: "Stay on the current frequency",
      body: `You’re mid-signal on “${top.title}” (${top.progress} ep logged). Lantern says: one more session before opening a new channel. You’ve tracked ~${hours.toFixed(1)} hours total.`,
      moodSlug: "hype",
      moodLabel: "Hype",
    };
  }

  if (mem.completedLog[0] && planning.length === 0) {
    return {
      headline: "Afterglow",
      body: `You finished “${mem.completedLog[0].title}” recently. The shelf has no next-up planning titles — open Browse or seal a soft follow-up so the desk isn’t empty after a high.`,
      moodSlug: "comfort",
      moodLabel: "Comfort",
    };
  }

  if (planning.length > 0) {
    const pick = buildTonightFromList(entries);
    if (pick) {
      return {
        headline: "One from the planning stack",
        body: `Lantern points at “${pick.title}” from your planning list. ${planning.length} waiting · ${completed.length} completed · ~${hours.toFixed(1)} hours logged.`,
        moodSlug: "comfort",
        moodLabel: "Comfort",
      };
    }
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

  // Prefer session pack mood when set
  if (session?.slug) {
    const exp = getExperienceIntent(session.slug);
    const mood =
      MOODS.find((m) => m.slug === session.slug) ||
      (exp
        ? { slug: exp.slug, label: exp.label }
        : null);
    if (mood) {
      return {
        headline: `Aligned to ${mood.label}`,
        body: `Your session pack is set to ${mood.label}. ${n} titles on the list · ~${hours.toFixed(1)} hours logged. Draw a cloud band if you want a spoken reading on this frequency.`,
        moodSlug: mood.slug,
        moodLabel: mood.label,
      };
    }
  }

  return {
    headline: "Keep the lantern lit",
    body: `${n} titles on the list · ~${hours.toFixed(1)} hours logged. Add progress or scores on Watchlist so the desk can read you more clearly.`,
    moodSlug: "fantasy",
    moodLabel: "Fantasy",
  };
}
