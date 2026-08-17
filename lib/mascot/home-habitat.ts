/**
 * Sprint 16 — Home habitat
 *
 * The corner is not just a clamp box — it is Lantern-ko’s desk home.
 * Favourite micro-spots, soft props (logical), voluntary return.
 */

import { clampToHabitat, type NavTarget } from "./navigation";
import type { MascotAnim } from "./types";
import type { MascotIntention } from "./director";
import type { MascotEmotions } from "./types";
import { bondStage, getMemory } from "./memory";
import { COMPANION } from "./personality";
import { dayPart } from "./personality";

export type HabitatSpotId =
  | "pillow"
  | "lantern"
  | "bookshelf"
  | "plant"
  | "screen"
  | "blanket"
  | "desk-edge"
  | "window";

export type HabitatSpot = {
  id: HabitatSpotId;
  label: string;
  /** Habitat-local XZ (legacy z axis — not WorldPoint) */
  pos: { x: number; z: number };
  /** Preferred anim while there */
  anim: MascotAnim;
  holdMs: number;
  thoughts: string[];
  /** Weight for random pick */
  weight: number;
  /** When this spot is more likely */
  preferWhen?: (e: MascotEmotions) => boolean;
};

/**
 * Layout (bottom-right desk corner, habitat space):
 *
 *   window · plant
 *   screen · bookshelf
 *   pillow · blanket · lantern
 *   desk-edge (front)
 */
export const HABITAT_SPOTS: HabitatSpot[] = [
  {
    id: "pillow",
    label: "pillow",
    pos: { x: 0.28, z: 0.06 },
    anim: "sleep",
    holdMs: 8_000,
    thoughts: ["Soft…", "Nap corner.", "Mmm."],
    weight: 1.2,
    preferWhen: (e) => e.sleepiness > 0.45 || e.energy < 0.35,
  },
  {
    id: "blanket",
    label: "blanket",
    pos: { x: 0.22, z: 0.04 },
    anim: "idle",
    holdMs: 4_000,
    thoughts: ["Warm.", "Cozy."],
    weight: 0.9,
    preferWhen: (e) => e.stress > 0.4 || e.sleepiness > 0.35,
  },
  {
    id: "lantern",
    label: "lantern",
    pos: { x: 0.38, z: 0.1 },
    anim: "think",
    holdMs: 3_500,
    thoughts: ["Glow.", "My light.", "Still warm."],
    weight: 1.1,
  },
  {
    id: "bookshelf",
    label: "tiny shelf",
    pos: { x: 0.42, z: 0.14 },
    anim: "think",
    holdMs: 4_000,
    thoughts: ["Manga stack.", "Hmm…", "That volume again."],
    weight: 1.0,
    preferWhen: (e) => e.curiosity > 0.45 || e.boredom > 0.4,
  },
  {
    id: "plant",
    label: "plant",
    pos: { x: 0.18, z: 0.16 },
    anim: "idle",
    holdMs: 3_000,
    thoughts: ["Still green.", "Hello, leaf."],
    weight: 0.7,
  },
  {
    id: "screen",
    label: "tiny screen",
    pos: { x: 0.12, z: 0.12 },
    anim: "point",
    holdMs: 2_500,
    thoughts: ["Signals…", "What’s on?"],
    weight: 0.85,
    preferWhen: (e) => e.curiosity > 0.5 || e.attention > 0.5,
  },
  {
    id: "desk-edge",
    label: "desk edge",
    pos: { x: 0.08, z: 0.02 },
    anim: "wave",
    holdMs: 2_000,
    thoughts: ["Watching the desk.", "Hi."],
    weight: 0.8,
    preferWhen: (e) => e.attention > 0.4,
  },
  {
    id: "window",
    label: "window",
    pos: { x: 0.35, z: 0.18 },
    anim: "idle",
    holdMs: 3_500,
    thoughts: ["Outside…", "Soft light."],
    weight: 0.75,
  },
];

let lastHomeAt = 0;
const HOME_COOLDOWN_MS = 28_000;

export function habitatPos(spot: HabitatSpot): NavTarget {
  return clampToHabitat(spot.pos.x, spot.pos.z);
}

export function pickFavouriteSpot(emotions: MascotEmotions): HabitatSpot {
  const stage = bondStage();
  const scored = HABITAT_SPOTS.map((s) => {
    let w = s.weight;
    if (s.preferWhen?.(emotions)) w *= 2.2;
    if (stage === "close" && (s.id === "pillow" || s.id === "lantern"))
      w *= 1.3;
    if (stage === "stranger" && s.id === "desk-edge") w *= 1.4;
    const part = dayPart();
    if (part === "night" && (s.id === "pillow" || s.id === "blanket")) w *= 1.8;
    if (part === "morning" && (s.id === "window" || s.id === "plant")) w *= 1.4;
    if (part === "evening" && (s.id === "bookshelf" || s.id === "lantern"))
      w *= 1.3;
    return { s, w };
  });
  const total = scored.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * total;
  for (const row of scored) {
    r -= row.w;
    if (r <= 0) return row.s;
  }
  return HABITAT_SPOTS[0];
}

export function thoughtForSpot(spot: HabitatSpot): string {
  const pool = spot.thoughts;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function shouldReturnHome(input: {
  intention: MascotIntention;
  emotions: MascotEmotions;
  busy: boolean;
  hasTarget: boolean;
  msSinceInteract: number;
}): boolean {
  if (input.busy) return false;
  if (Date.now() - lastHomeAt < HOME_COOLDOWN_MS) return false;

  const e = input.emotions;
  const part = dayPart();

  if (e.sleepiness > 0.55 || e.energy < 0.28) return Math.random() < 0.55;
  if (e.stress > 0.5) return Math.random() < 0.4;
  if (part === "night" && e.energy < 0.55) return Math.random() < 0.45;
  if (COMPANION.traits.laziness > 0.5 && Math.random() < 0.12) return true;
  if (
    (input.intention === "explore" ||
      input.intention === "investigate" ||
      input.intention === "guide") &&
    Math.random() < 0.08
  )
    return true;
  if (
    (input.intention === "idle" || input.intention === "observe") &&
    input.msSinceInteract > 25_000 &&
    Math.random() < 0.2
  )
    return true;

  return false;
}

export type HomeRunner = {
  setTarget: (t: NavTarget | null) => void;
  requestAnim: (req: {
    anim: MascotAnim;
    holdMs?: number;
    force?: boolean;
  }) => boolean;
  setThought: (t: string) => void;
  setIntention: (i: MascotIntention) => void;
};

export function executeGoHome(
  emotions: MascotEmotions,
  runner: HomeRunner,
): { ms: number; spot: HabitatSpot } {
  lastHomeAt = Date.now();
  const spot = pickFavouriteSpot(emotions);
  const pos = habitatPos(spot);
  const thought = thoughtForSpot(spot);

  runner.setIntention("rest");
  runner.setTarget(pos);
  runner.requestAnim({ anim: "walk" });
  runner.setThought(thought);

  const settleDelay = 900;
  window.setTimeout(() => {
    runner.requestAnim({
      anim: spot.anim,
      holdMs: spot.holdMs,
      force: spot.anim === "sleep",
    });
    runner.setThought(thought);
    if (spot.anim === "sleep") runner.setIntention("sleep");
    else runner.setIntention("rest");
  }, settleDelay);

  return { ms: settleDelay + spot.holdMs, spot };
}

export function defaultHomePos(): NavTarget {
  return clampToHabitat(0.32, 0.08);
}

export function describeHabitat(): string {
  const mem = getMemory();
  const stage = bondStage(mem);
  return `desk home · ${stage} · ${HABITAT_SPOTS.length} spots`;
}
