/**
 * Sprint 4 — Layered animation system
 *
 * Locomotion and social channels are independent.
 * Expression (Sprint 2) is a third channel and stays in expression.ts.
 *
 * Example: walk (loco) + wave (social) + happy (expression) can coexist.
 * We still publish a single MascotAnim for legacy consumers; that is a
 * *resolved* view, not the source of truth.
 */

import type { MascotAnim, MascotEmotions } from "./types";

/** Body / movement channel */
export type LocomotionAnim =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "fall"
  | "land"
  | "climb"
  | "sleep";

/** Gesture / social overlay — plays on top of locomotion when possible */
export type SocialAnim =
  | "none"
  | "wave"
  | "point"
  | "happy"
  | "think"
  | "surprised"
  | "bow"
  | "celebrate";

export type AnimLayers = {
  locomotion: LocomotionAnim;
  social: SocialAnim;
  /** When social hold expires (ms epoch); 0 = none */
  socialUntil: number;
  /** When locomotion is locked (e.g. jump arc); 0 = free */
  locoUntil: number;
};

export const DEFAULT_LAYERS: AnimLayers = {
  locomotion: "idle",
  social: "none",
  socialUntil: 0,
  locoUntil: 0,
};

const LOCO_PRIORITY: Record<LocomotionAnim, number> = {
  idle: 1,
  sleep: 2,
  walk: 3,
  run: 4,
  land: 5,
  climb: 6,
  fall: 7,
  jump: 8,
};

const SOCIAL_PRIORITY: Record<SocialAnim, number> = {
  none: 0,
  think: 3,
  point: 4,
  wave: 5,
  happy: 6,
  bow: 6,
  celebrate: 7,
  surprised: 8,
};

/** Map legacy single anim → layers */
export function layersFromAnim(anim: MascotAnim): Pick<AnimLayers, "locomotion" | "social"> {
  switch (anim) {
    case "walk":
      return { locomotion: "walk", social: "none" };
    case "jump":
      return { locomotion: "jump", social: "none" };
    case "land":
      return { locomotion: "land", social: "none" };
    case "sleep":
      return { locomotion: "sleep", social: "none" };
    case "idle":
      return { locomotion: "idle", social: "none" };
    case "wave":
      return { locomotion: "idle", social: "wave" };
    case "point":
      return { locomotion: "idle", social: "point" };
    case "happy":
      return { locomotion: "idle", social: "happy" };
    case "think":
      return { locomotion: "idle", social: "think" };
    case "surprised":
      return { locomotion: "idle", social: "surprised" };
    default:
      return { locomotion: "idle", social: "none" };
  }
}

/**
 * Resolve layers → single MascotAnim for procedural-motion / Actor that still
 * key off one string. Social overlays win for gestures; loco wins for movement.
 */
export function resolveAnim(layers: AnimLayers, now = Date.now()): MascotAnim {
  const socialActive =
    layers.social !== "none" &&
    (layers.socialUntil === 0 || now < layers.socialUntil);

  // Airborne / hard loco always visible in body
  if (layers.locomotion === "jump") return "jump";
  if (layers.locomotion === "fall") return "jump"; // fall uses jump stretch
  if (layers.locomotion === "land") return "land";
  if (layers.locomotion === "climb") return "jump";
  if (layers.locomotion === "sleep") return "sleep";
  if (layers.locomotion === "walk" || layers.locomotion === "run") {
    // Walking can keep a short social gesture on arms via social channel;
    // resolved anim stays walk so body keeps walk bob.
    if (socialActive && (layers.social === "wave" || layers.social === "point")) {
      // Prefer walk body; social is applied separately in procedural arms
      return "walk";
    }
    return "walk";
  }

  if (socialActive) {
    switch (layers.social) {
      case "wave":
        return "wave";
      case "point":
        return "point";
      case "happy":
      case "celebrate":
        return "happy";
      case "think":
        return "think";
      case "surprised":
        return "surprised";
      case "bow":
        return "think";
      default:
        break;
    }
  }

  return "idle";
}

export type LayerRequest =
  | { channel: "locomotion"; anim: LocomotionAnim; holdMs?: number; force?: boolean }
  | { channel: "social"; anim: SocialAnim; holdMs?: number; force?: boolean }
  | { channel: "legacy"; anim: MascotAnim; holdMs?: number; force?: boolean };

/** Apply a request onto layers (immutable update). */
export function applyLayerRequest(
  prev: AnimLayers,
  req: LayerRequest,
  now = Date.now(),
): AnimLayers {
  if (req.channel === "legacy") {
    const mapped = layersFromAnim(req.anim);
    const isLoco =
      mapped.social === "none" &&
      (mapped.locomotion === "walk" ||
        mapped.locomotion === "jump" ||
        mapped.locomotion === "land" ||
        mapped.locomotion === "sleep" ||
        mapped.locomotion === "idle");

    if (mapped.social !== "none") {
      // Social legacy anim
      if (
        !req.force &&
        prev.social !== "none" &&
        SOCIAL_PRIORITY[mapped.social] < SOCIAL_PRIORITY[prev.social] &&
        now < prev.socialUntil
      ) {
        return prev;
      }
      return {
        ...prev,
        // Keep current loco if walking/jumping
        locomotion:
          prev.locomotion === "walk" ||
          prev.locomotion === "jump" ||
          prev.locomotion === "run"
            ? prev.locomotion
            : mapped.locomotion,
        social: mapped.social,
        socialUntil: req.holdMs ? now + req.holdMs : now + 1200,
      };
    }

    // Locomotion legacy
    if (
      !req.force &&
      now < prev.locoUntil &&
      LOCO_PRIORITY[mapped.locomotion] < LOCO_PRIORITY[prev.locomotion]
    ) {
      return prev;
    }
    return {
      ...prev,
      locomotion: mapped.locomotion,
      locoUntil: req.holdMs ? now + req.holdMs : mapped.locomotion === "jump" ? now + 450 : 0,
      // Clear social on sleep
      social: mapped.locomotion === "sleep" ? "none" : prev.social,
      socialUntil: mapped.locomotion === "sleep" ? 0 : prev.socialUntil,
    };
  }

  if (req.channel === "locomotion") {
    if (
      !req.force &&
      now < prev.locoUntil &&
      LOCO_PRIORITY[req.anim] < LOCO_PRIORITY[prev.locomotion]
    ) {
      return prev;
    }
    return {
      ...prev,
      locomotion: req.anim,
      locoUntil: req.holdMs ? now + req.holdMs : req.anim === "jump" ? now + 450 : 0,
      social: req.anim === "sleep" ? "none" : prev.social,
      socialUntil: req.anim === "sleep" ? 0 : prev.socialUntil,
    };
  }

  // social channel
  if (
    !req.force &&
    prev.social !== "none" &&
    now < prev.socialUntil &&
    SOCIAL_PRIORITY[req.anim] < SOCIAL_PRIORITY[prev.social]
  ) {
    return prev;
  }
  return {
    ...prev,
    social: req.anim,
    socialUntil: req.holdMs ? now + req.holdMs : req.anim === "none" ? 0 : now + 1200,
  };
}

/** Tick: expire holds, auto land after jump if grounded signal provided. */
export function tickLayers(
  layers: AnimLayers,
  opts: { onGround: boolean; now?: number },
): AnimLayers {
  const now = opts.now ?? Date.now();
  let next = { ...layers };

  if (next.social !== "none" && next.socialUntil > 0 && now >= next.socialUntil) {
    next.social = "none";
    next.socialUntil = 0;
  }

  if (next.locoUntil > 0 && now >= next.locoUntil) {
    next.locoUntil = 0;
    if (next.locomotion === "jump" || next.locomotion === "fall") {
      next.locomotion = opts.onGround ? "land" : "fall";
      if (opts.onGround) next.locoUntil = now + 280;
    } else if (next.locomotion === "land") {
      next.locomotion = "idle";
    }
  }

  // Grounded while marked fall → land
  if (next.locomotion === "fall" && opts.onGround) {
    next.locomotion = "land";
    next.locoUntil = now + 280;
  }

  return next;
}

export function preferredLoco(
  emotions: MascotEmotions,
  hasTarget: boolean,
): LocomotionAnim {
  if (emotions.sleepiness > 0.72 && emotions.energy < 0.35) return "sleep";
  if (hasTarget) return emotions.energy > 0.75 ? "run" : "walk";
  return "idle";
}
