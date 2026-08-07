/**
 * Lantern-ko — character identity (Sprint 1)
 *
 * Systems below (emotions, goals, anims) should *express* this personality,
 * not invent a new one per event.
 */

export const COMPANION = {
  name: "Lantern-ko",
  shortName: "Lantern",
  title: "desk spirit of the late-night console",

  /** One-line soul */
  essence:
    "A shy-curious lantern spirit who lives on your desk, collects soft signals, and quietly tries to help you find the next anime worth staying up for.",

  /** Core traits 0–1 (stable baseline; emotions drift around these) */
  traits: {
    curiosity: 0.72,
    shyness: 0.55,
    humour: 0.45,
    loyalty: 0.8,
    energy: 0.48,
    confidence: 0.42,
    empathy: 0.7,
    mischief: 0.28,
  },

  /** Genre affinities — positive = lean in, negative = retreat */
  genres: {
    slice_of_life: 0.85,
    romance: 0.7,
    mystery: 0.65,
    fantasy: 0.6,
    drama: 0.55,
    adventure: 0.5,
    comedy: 0.55,
    sports: 0.35,
    mecha: 0.4,
    sci_fi: 0.45,
    horror: -0.75,
    thriller: -0.35,
    gore: -0.9,
  } as Record<string, number>,

  likes: [
    "quiet recommendations",
    "being petted after a long stretch of silence",
    "slice-of-life and soft romance",
    "watching you finish a show",
    "warm desk light",
    "finding a hidden gem card",
  ],

  dislikes: [
    "jump scares and pure horror",
    "being ignored for hours",
    "loud sudden UI",
    "empty shelves with nothing to point at",
    "being dragged roughly",
  ],

  habits: [
    "returns to the corner after exploring",
    "points at cards before you notice them",
    "waves when a seal completes",
    "naps when the page is quiet",
    "leans toward the cursor when curious",
  ],

  /** Soft speech lines — never spam; optional UI later */
  voice: {
    tone: "soft, slightly formal, a little playful",
    lines: {
      greet: ["You’re back.", "I kept the desk warm.", "Found a few signals."],
      found: ["I think you’d like this.", "This one feels right.", "Peek?"],
      wait: ["I’ve been waiting.", "Still here."],
      horror: ["…I’ll stay over here.", "Too sharp for me."],
      romance: ["Oh—", "Soft one."],
      pet: ["…thanks.", "Okay."],
      bored: ["Quiet desk today.", "Anything to find?"],
    },
  },
} as const;

export type GenreKey = keyof typeof COMPANION.genres;

/** Map free-text / AniList genre strings → affinity score */
export function genreAffinity(label: string): number {
  const g = label.toLowerCase().replace(/[\s-]+/g, "_");
  const table = COMPANION.genres;
  if (g in table) return table[g as GenreKey];
  // fuzzy
  if (g.includes("horror") || g.includes("gore")) return table.horror;
  if (g.includes("romance") || g.includes("love")) return table.romance;
  if (g.includes("slice") || g.includes("iyashikei")) return table.slice_of_life;
  if (g.includes("mecha") || g.includes("robot")) return table.mecha;
  if (g.includes("comedy") || g.includes("gag")) return table.comedy;
  if (g.includes("mystery") || g.includes("detective")) return table.mystery;
  if (g.includes("thriller") || g.includes("suspense")) return table.thriller;
  if (g.includes("fantasy")) return table.fantasy;
  if (g.includes("sport")) return table.sports;
  if (g.includes("sci") || g.includes("space")) return table.sci_fi;
  return 0.1;
}

export type DayPart = "dawn" | "morning" | "afternoon" | "evening" | "night" | "late";

export function dayPart(date = new Date()): DayPart {
  const h = date.getHours();
  if (h < 5) return "late";
  if (h < 8) return "dawn";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  if (h < 24) return "night";
  return "late";
}

/** Preferred ambient activity by time of day */
export function routineBias(part: DayPart): {
  sleepiness: number;
  energy: number;
  curiosity: number;
  preferNap: boolean;
  preferExplore: boolean;
} {
  switch (part) {
    case "dawn":
      return {
        sleepiness: 0.55,
        energy: 0.35,
        curiosity: 0.4,
        preferNap: true,
        preferExplore: false,
      };
    case "morning":
      return {
        sleepiness: 0.25,
        energy: 0.55,
        curiosity: 0.6,
        preferNap: false,
        preferExplore: true,
      };
    case "afternoon":
      return {
        sleepiness: 0.2,
        energy: 0.5,
        curiosity: 0.55,
        preferNap: false,
        preferExplore: true,
      };
    case "evening":
      return {
        sleepiness: 0.3,
        energy: 0.45,
        curiosity: 0.65,
        preferNap: false,
        preferExplore: true,
      };
    case "night":
      return {
        sleepiness: 0.5,
        energy: 0.4,
        curiosity: 0.7,
        preferNap: false,
        preferExplore: true,
      };
    case "late":
    default:
      return {
        sleepiness: 0.75,
        energy: 0.25,
        curiosity: 0.35,
        preferNap: true,
        preferExplore: false,
      };
  }
}

/**
 * Personality-shaped reaction to an event.
 * Downstream systems map ReactionIntent → emotion bumps + anims.
 */
export type ReactionIntent =
  | "hide"
  | "blush"
  | "pilot"
  | "celebrate"
  | "curious"
  | "shy_wave"
  | "point"
  | "nap"
  | "stretch"
  | "complain"
  | "trust"
  | "neutral";

export function reactToGenres(genres: string[]): ReactionIntent {
  if (!genres.length) return "neutral";
  let score = 0;
  for (const g of genres) score += genreAffinity(g);
  const avg = score / genres.length;
  if (avg <= -0.5) return "hide";
  if (avg >= 0.65) return "curious";
  // romance-leaning blush
  if (genres.some((g) => genreAffinity(g) > 0.6 && /romance|love|slice/i.test(g)))
    return "blush";
  if (genres.some((g) => /mecha|robot/i.test(g))) return "pilot";
  return "neutral";
}

export function reactToEvent(
  kind:
    | "pet"
    | "drag"
    | "seal"
    | "complete"
    | "search"
    | "idle-long"
    | "modal-open"
    | "route",
): ReactionIntent {
  const t = COMPANION.traits;
  switch (kind) {
    case "pet":
      return t.shyness > 0.5 ? "shy_wave" : "trust";
    case "drag":
      return "complain";
    case "seal":
    case "complete":
      return "celebrate";
    case "search":
      return "curious";
    case "idle-long":
      return t.energy < 0.5 ? "nap" : "stretch";
    case "modal-open":
      return t.shyness > 0.45 ? "curious" : "point";
    case "route":
      return "shy_wave";
    default:
      return "neutral";
  }
}

/** Seed emotion baseline from traits + time of day */
export function personalityEmotionSeed(date = new Date()) {
  const t = COMPANION.traits;
  const r = routineBias(dayPart(date));
  return {
    curiosity: clamp01(t.curiosity * 0.7 + r.curiosity * 0.3),
    energy: clamp01(t.energy * 0.6 + r.energy * 0.4),
    happiness: 0.55,
    boredom: 0.15,
    sleepiness: clamp01(r.sleepiness),
    attention: 0.5,
    confidence: t.confidence,
    stress: t.shyness * 0.2,
  };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
