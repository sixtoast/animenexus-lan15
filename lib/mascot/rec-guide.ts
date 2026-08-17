/**
 * Sprint 13 — Proactive recommendation guide
 *
 * Sometimes discovers high-affinity cards alongside the user.
 * Walk → look → point → thought. Never spam.
 */

import type { Landmark } from "./ui-registry";
import {
  listByType,
  landmarkToHabitat,
  preferredPoint,
  refreshLandmarkRects,
} from "./ui-registry";
import { relationshipHints, getMemory, bondStage } from "./memory";
import { COMPANION } from "./personality";
import type { MascotEmotions } from "./types";
import type { MascotIntention } from "./director";

const GLOBAL_COOLDOWN_MS = 45_000;
const PER_CARD_COOLDOWN_MS = 120_000;
const MAX_GUIDES_PER_SESSION = 4;

let lastGuideAt = 0;
let guidesThisSession = 0;
const guidedIds = new Map<string, number>();

export type RecGuidePlan = {
  landmark: Landmark;
  confidence: number;
  thought: string;
  habitat: { x: number; y?: number; z?: number };
  lookClient: { x: number; y: number };
};

function scoreCard(lm: Landmark, emotions: MascotEmotions): number {
  let score = lm.importance * 0.35 + lm.priority * 0.08;

  if (lm.rect) {
    const area = lm.rect.width * lm.rect.height;
    score += Math.min(0.2, area / 80_000);
    const cx = lm.rect.left + lm.rect.width / 2;
    const cy = lm.rect.top + lm.rect.height / 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dist = Math.hypot(cx - vw / 2, cy - vh * 0.4) / Math.hypot(vw, vh);
    score += (1 - dist) * 0.15;
  }

  score += emotions.curiosity * 0.12;
  score += emotions.attention * 0.08;

  const rel = relationshipHints();
  if (rel.prefersGuide) score += 0.1;
  score += COMPANION.traits.helpfulness * 0.08;
  score += COMPANION.traits.curiosity * 0.06;

  score += (rel.engagementRate - 0.4) * 0.1;

  const last = guidedIds.get(lm.id) ?? 0;
  if (Date.now() - last < PER_CARD_COOLDOWN_MS) score -= 0.5;

  return Math.max(0, Math.min(1, score));
}

const THOUGHTS_BY_STAGE: Record<string, string[]> = {
  stranger: ["…maybe this?", "A signal.", "Hmm."],
  acquaintance: ["This one?", "Soft signal.", "Worth a look."],
  friend: ["Something for you.", "This fits.", "Try this?"],
  close: ["I found one.", "This is yours.", "You’ll like this."],
};

function pickThought(): string {
  const stage = bondStage();
  const pool = THOUGHTS_BY_STAGE[stage] ?? THOUGHTS_BY_STAGE.acquaintance;
  return pool[Math.floor(Math.random() * pool.length)];
}

function confidenceThreshold(): number {
  const stage = bondStage();
  switch (stage) {
    case "close":
      return 0.42;
    case "friend":
      return 0.48;
    case "acquaintance":
      return 0.55;
    default:
      return 0.62;
  }
}

export function canProposeGuide(
  intention: MascotIntention,
  emotions: MascotEmotions,
  busy: boolean,
): boolean {
  if (busy) return false;
  if (guidesThisSession >= MAX_GUIDES_PER_SESSION) return false;
  if (Date.now() - lastGuideAt < GLOBAL_COOLDOWN_MS) return false;

  const okIntent: MascotIntention[] = [
    "idle",
    "observe",
    "explore",
    "investigate",
    "inspect-recommendation",
    "guide",
  ];
  if (!okIntent.includes(intention)) return false;

  if (emotions.sleepiness > 0.65 || emotions.stress > 0.55) return false;
  if (emotions.curiosity < 0.3 && emotions.attention < 0.3) return false;

  const rel = relationshipHints();
  if (rel.prefersQuiet && Math.random() < 0.6) return false;

  const help = COMPANION.traits.helpfulness;
  if (help < 0.35 && Math.random() < 0.5) return false;

  return true;
}

export function proposeRecGuide(
  emotions: MascotEmotions,
): RecGuidePlan | null {
  if (typeof window === "undefined") return null;
  refreshLandmarkRects();

  const cards = [
    ...listByType("card"),
    ...listByType("rail"),
    ...listByType("carousel"),
    ...listByType("hero"),
  ].filter((l) => l.visible && l.open && l.rect);

  if (!cards.length) return null;

  let best: Landmark | null = null;
  let bestScore = -1;
  for (const lm of cards) {
    const s = scoreCard(lm, emotions);
    if (s > bestScore) {
      bestScore = s;
      best = lm;
    }
  }

  if (!best || bestScore < confidenceThreshold()) return null;

  const kind =
    best.type === "hero" ? "top" : best.type === "card" ? "thumb" : "center";
  const hab = landmarkToHabitat(best, kind);
  const pt = preferredPoint(best, kind);
  if (!hab || !pt) return null;

  return {
    landmark: best,
    confidence: bestScore,
    thought: pickThought(),
    habitat: hab,
    lookClient: { x: pt.clientX, y: pt.clientY },
  };
}

export function markGuideFired(landmarkId: string) {
  lastGuideAt = Date.now();
  guidesThisSession += 1;
  guidedIds.set(landmarkId, Date.now());
}

export function resetGuideSession() {
  guidesThisSession = 0;
}

export type RecGuideRunner = {
  setTarget: (t: { x: number; y: number } | null) => void;
  requestAnim: (req: {
    anim: "walk" | "point" | "think" | "happy";
    holdMs?: number;
    force?: boolean;
  }) => boolean;
  setLookBias: (b: { x: number; y: number }) => void;
  setThought: (t: string) => void;
  setIntention: (i: MascotIntention) => void;
  clampHabitat: (x: number, y: number) => { x: number; y: number };
};

/** Walk → look → point sequence (~2.5s) */
export function executeRecGuide(
  plan: RecGuidePlan,
  runner: RecGuideRunner,
): number {
  markGuideFired(plan.landmark.id);
  runner.setIntention("guide");
  runner.setThought(plan.thought);

  const hy =
    "y" in plan.habitat && typeof (plan.habitat as { y?: number }).y === "number"
      ? (plan.habitat as { y: number }).y
      : (plan.habitat as { z: number }).z;
  const target = runner.clampHabitat(plan.habitat.x * 0.85, hy * 0.85);
  runner.setTarget(target);
  runner.requestAnim({ anim: "walk" });

  runner.setLookBias({
    x: (plan.lookClient.x / window.innerWidth - 0.5) * 2,
    y: (plan.lookClient.y / window.innerHeight - 0.5) * 2,
  });

  window.setTimeout(() => {
    runner.requestAnim({ anim: "point", holdMs: 1400, force: true });
    runner.setThought(plan.thought);
  }, 900);

  window.setTimeout(() => {
    runner.requestAnim({ anim: "think", holdMs: 800 });
  }, 2400);

  return 3200;
}
