/**
 * Lantern-ko — character identity (Sprint 1 + Sprint 6 depth)
 *
 * Stable traits shape behaviour probabilities across Director, Utility AI,
 * and event reactions. Emotions drift; traits do not.
 */

export const COMPANION = {
  name: "Lantern-ko",
  shortName: "Lantern",
  title: "desk spirit of the late-night console",

  essence:
    "A shy-curious lantern spirit who lives on your desk, collects soft signals, and quietly tries to help you find the next anime worth staying up for.",

  /**
 * Core traits 0–1 (stable baseline).
 * Sprint 6 expanded set — all systems should consult these.
 */
  traits: {
    curiosity: 0.72,
    playfulness: 0.48,
    shyness: 0.55,
    confidence: 0.42,
    mischievousness: 0.28,
    helpfulness: 0.74,
    laziness: 0.38,
    enthusiasm: 0.58,
    // retained aliases used by older call sites
    humour: 0.45,
    loyalty: 0.8,
    energy: 0.48,
    empathy: 0.7,
    /** @deprecated use mischievousness */
    mischief: 0.28,
  },

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

export type TraitKey = keyof typeof COMPANION.traits;
export type GenreKey = keyof typeof COMPANION.genres;

/** Multipliers applied to Utility AI goal scores (Sprint 6). */
export type TraitGoalBias = {
  nap: number;
  ponder: number;
  "seek-attention": number;
  wander: number;
  celebrate: number;
  idle: number;
};

/**
 * How strongly each goal is favoured by stable personality.
 * Values are additives roughly in −0.25…+0.35 range before emotion mix.
 */
export function traitGoalBias(): TraitGoalBias {
  const t = COMPANION.traits;
  return {
    nap: t.laziness * 0.35 + (1 - t.energy) * 0.1 - t.enthusiasm * 0.08,
    ponder: t.shyness * 0.2 + (1 - t.confidence) * 0.12,
    "seek-attention":
      t.playfulness * 0.15 +
      t.loyalty * 0.1 -
      t.shyness * 0.18 +
      t.helpfulness * 0.08,
    wander:
      t.curiosity * 0.28 +
      t.playfulness * 0.1 +
      t.mischievousness * 0.12 -
      t.laziness * 0.2,
    celebrate: t.enthusiasm * 0.25 + t.playfulness * 0.1 + t.humour * 0.05,
    idle: t.laziness * 0.12 + (1 - t.curiosity) * 0.08,
  };
}

/** Loneliness threshold scale — shy companions wait longer before seeking. */
export function traitLonelyScale(): number {
  const t = COMPANION.traits;
  // >1 = waits longer; <1 = seeks sooner
  return 0.75 + t.shyness * 0.55 - t.playfulness * 0.15 - t.loyalty * 0.1;
}

/** Chance to interact with cursor / UI when noticed (0–1). */
export function traitCursorEngageChance(): number {
  const t = COMPANION.traits;
  return clamp01(
    0.25 + t.playfulness * 0.35 + t.curiosity * 0.2 - t.shyness * 0.25,
  );
}

/** Explore vs nap lean for idle-long events. */
export function traitIdleLean(): "nap" | "stretch" | "curious" {
  const t = COMPANION.traits;
  if (t.laziness > 0.55 || t.energy < 0.4) return "nap";
  if (t.curiosity > 0.65 && t.playfulness > 0.4) return "curious";
  return t.energy < 0.5 ? "nap" : "stretch";
}

export function genreAffinity(label: string): number {
  const g = label.toLowerCase().replace(/[\s-]+/g, "_");
  const table = COMPANION.genres;
  if (g in table) return table[g as GenreKey];
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

export function routineBias(part: DayPart): {
  sleepiness: number;
  energy: number;
  curiosity: number;
  preferNap: boolean;
  preferExplore: boolean;
} {
  const t = COMPANION.traits;
  // Base by time, then nudge with laziness / curiosity / energy traits
  let base: {
    sleepiness: number;
    energy: number;
    curiosity: number;
    preferNap: boolean;
    preferExplore: boolean;
  };
  switch (part) {
    case "dawn":
      base = {
        sleepiness: 0.55,
        energy: 0.35,
        curiosity: 0.4,
        preferNap: true,
        preferExplore: false,
      };
      break;
    case "morning":
      base = {
        sleepiness: 0.25,
        energy: 0.55,
        curiosity: 0.6,
        preferNap: false,
        preferExplore: true,
      };
      break;
    case "afternoon":
      base = {
        sleepiness: 0.2,
        energy: 0.5,
        curiosity: 0.55,
        preferNap: false,
        preferExplore: true,
      };
      break;
    case "evening":
      base = {
        sleepiness: 0.3,
        energy: 0.45,
        curiosity: 0.65,
        preferNap: false,
        preferExplore: true,
      };
      break;
    case "night":
      base = {
        sleepiness: 0.5,
        energy: 0.4,
        curiosity: 0.7,
        preferNap: false,
        preferExplore: true,
      };
      break;
    case "late":
    default:
      base = {
        sleepiness: 0.75,
        energy: 0.25,
        curiosity: 0.35,
        preferNap: true,
        preferExplore: false,
      };
      break;
  }
  base.sleepiness = clamp01(base.sleepiness + t.laziness * 0.12 - t.enthusiasm * 0.05);
  base.energy = clamp01(base.energy * (0.7 + t.energy * 0.3));
  base.curiosity = clamp01(base.curiosity * (0.75 + t.curiosity * 0.25));
  if (t.laziness > 0.6) base.preferNap = true;
  if (t.curiosity > 0.7 && t.laziness < 0.45) base.preferExplore = true;
  return base;
}

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
  const t = COMPANION.traits;
  // Shy companions hide sooner from negative affinity
  if (avg <= -0.5 || (avg < -0.25 && t.shyness > 0.6)) return "hide";
  if (avg >= 0.65 || (avg > 0.45 && t.curiosity > 0.65)) return "curious";
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
      // Shy → shy_wave; confident/playful → trust more often
      if (t.shyness > 0.55) return "shy_wave";
      if (t.playfulness > 0.55 || t.confidence > 0.55) return "trust";
      return t.shyness > 0.4 ? "shy_wave" : "trust";
    case "drag":
      return t.mischievousness > 0.5 ? "complain" : "complain";
    case "seal":
    case "complete":
      return t.enthusiasm > 0.4 ? "celebrate" : "shy_wave";
    case "search":
      return t.curiosity > 0.4 ? "curious" : "point";
    case "idle-long": {
      const lean = traitIdleLean();
      if (lean === "nap") return "nap";
      if (lean === "curious") return "curious";
      return "stretch";
    }
    case "modal-open":
      if (t.shyness > 0.6) return "curious";
      if (t.helpfulness > 0.65) return "point";
      return t.curiosity > 0.5 ? "curious" : "point";
    case "route":
      return t.shyness > 0.5 ? "shy_wave" : "point";
    default:
      return "neutral";
  }
}

export function personalityEmotionSeed(date = new Date()) {
  const t = COMPANION.traits;
  const r = routineBias(dayPart(date));
  return {
    curiosity: clamp01(t.curiosity * 0.7 + r.curiosity * 0.3),
    energy: clamp01(t.energy * 0.55 + r.energy * 0.35 + t.enthusiasm * 0.1),
    happiness: clamp01(0.5 + t.playfulness * 0.1),
    boredom: clamp01(0.12 + t.laziness * 0.08),
    sleepiness: clamp01(r.sleepiness + t.laziness * 0.08),
    attention: clamp01(0.45 + t.helpfulness * 0.1),
    confidence: t.confidence,
    stress: clamp01(t.shyness * 0.22),
  };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
