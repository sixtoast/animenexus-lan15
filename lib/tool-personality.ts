/**
 * Tool personality system (Sprint 24).
 * Shared DeskShell chrome; each tool has a distinct identity / atmosphere.
 */

export type ToolPersonalityId =
  | "radar"
  | "oracle"
  | "challenge"
  | "taste"
  | "sauce"
  | "motion"
  | "stats"
  | "fusion"
  | "compare"
  | "completionist"
  | "dislike"
  | "fanzone"
  | "generic";

export type ToolPersonality = {
  id: ToolPersonalityId;
  /** Short identity noun */
  role: string;
  /** One-line atmosphere */
  atmosphere: string;
  /** Accent token for CSS data-personality */
  accent: string;
};

export const TOOL_PERSONALITIES: Record<ToolPersonalityId, ToolPersonality> = {
  radar: {
    id: "radar",
    role: "Instrument",
    atmosphere: "Scan the horizon. Contacts only after the sweep.",
    accent: "instrument",
  },
  oracle: {
    id: "oracle",
    role: "Broadcast",
    atmosphere: "Late-night desk. Tune a frequency, then listen.",
    accent: "broadcast",
  },
  challenge: {
    id: "challenge",
    role: "Game",
    atmosphere: "Silhouette on. Guess the signal.",
    accent: "game",
  },
  taste: {
    id: "taste",
    role: "Archive",
    atmosphere: "Your shelf, told as a story — not a vanity dashboard.",
    accent: "archive",
  },
  sauce: {
    id: "sauce",
    role: "Investigation",
    atmosphere: "Trace the frame. Drop, paste, identify.",
    accent: "investigate",
  },
  motion: {
    id: "motion",
    role: "Studio",
    atmosphere: "Clip room — honest motion studies.",
    accent: "studio",
  },
  stats: {
    id: "stats",
    role: "Editorial",
    atmosphere: "Year in anime — report, not chart spam.",
    accent: "editorial",
  },
  fusion: {
    id: "fusion",
    role: "Laboratory",
    atmosphere: "Blend two frequencies. See what resonates.",
    accent: "lab",
  },
  compare: {
    id: "compare",
    role: "Balance",
    atmosphere: "Two titles on the scale.",
    accent: "balance",
  },
  completionist: {
    id: "completionist",
    role: "Queue",
    atmosphere: "Finish what you started. Rank what waits.",
    accent: "queue",
  },
  dislike: {
    id: "dislike",
    role: "Inverse",
    atmosphere: "Opposite of your shelf — deliberate contrast.",
    accent: "inverse",
  },
  fanzone: {
    id: "fanzone",
    role: "Lounge",
    atmosphere: "Bingo, confessions, DNA — community soft space.",
    accent: "lounge",
  },
  generic: {
    id: "generic",
    role: "Desk",
    atmosphere: "Shared Night Desk chrome.",
    accent: "desk",
  },
};

export function toolPersonality(
  id?: ToolPersonalityId | string | null,
): ToolPersonality {
  if (id && id in TOOL_PERSONALITIES) {
    return TOOL_PERSONALITIES[id as ToolPersonalityId];
  }
  return TOOL_PERSONALITIES.generic;
}
