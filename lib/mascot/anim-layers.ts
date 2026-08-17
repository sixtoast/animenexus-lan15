/**
 * Sprint 4 — Layered animation system
 */

import type { MascotAnim, MascotEmotions } from "./types";

export type LocomotionAnim =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "fall"
  | "land"
  | "climb"
  | "sleep"
  | "sit";

export type SocialAnim =
  | "none"
  | "wave"
  | "point"
  | "happy"
  | "think"
  | "surprised"
  | "bow"
  | "celebrate"
  | "nod"
  | "shy"
  | "stretch";

export type AnimLayers = {
  locomotion: LocomotionAnim;
  social: SocialAnim;
  socialUntil: number;
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
  sit: 2,
  sleep: 3,
  walk: 4,
  run: 5,
  land: 6,
  climb: 7,
  fall: 8,
  jump: 9,
};

const SOCIAL_PRIORITY: Record<SocialAnim, number> = {
  none: 0,
  nod: 2,
  think: 3,
  point: 4,
  wave: 5,
  happy: 6,
  bow: 6,
  stretch: 6,
  shy: 6,
  celebrate: 7,
  surprised: 8,
};

export function layersFromAnim(
  anim: MascotAnim,
): Pick<AnimLayers, "locomotion" | "social"> {
  switch (anim) {
    case "walk":
      return { locomotion: "walk", social: "none" };
    case "run":
      return { locomotion: "run", social: "none" };
    case "jump":
      return { locomotion: "jump", social: "none" };
    case "land":
      return { locomotion: "land", social: "none" };
    case "sleep":
      return { locomotion: "sleep", social: "none" };
    case "sit":
      return { locomotion: "sit", social: "none" };
    case "idle":
      return { locomotion: "idle", social: "none" };
    case "wave":
      return { locomotion: "idle", social: "wave" };
    case "point":
      return { locomotion: "idle", social: "point" };
    case "happy":
      return { locomotion: "idle", social: "happy" };
    case "celebrate":
      return { locomotion: "idle", social: "celebrate" };
    case "think":
      return { locomotion: "idle", social: "think" };
    case "surprised":
      return { locomotion: "idle", social: "surprised" };
    case "bow":
      return { locomotion: "idle", social: "bow" };
    case "nod":
      return { locomotion: "idle", social: "nod" };
    case "shy":
      return { locomotion: "idle", social: "shy" };
    case "stretch":
      return { locomotion: "idle", social: "stretch" };
    default:
      return { locomotion: "idle", social: "none" };
  }
}

export function resolveAnim(layers: AnimLayers, now = Date.now()): MascotAnim {
  const socialActive =
    layers.social !== "none" &&
    (layers.socialUntil === 0 || now < layers.socialUntil);

  if (layers.locomotion === "jump") return "jump";
  if (layers.locomotion === "fall") return "jump";
  if (layers.locomotion === "land") return "land";
  if (layers.locomotion === "climb") return "jump";
  if (layers.locomotion === "sleep") return "sleep";
  if (layers.locomotion === "sit") return "sit";
  if (layers.locomotion === "walk" || layers.locomotion === "run") {
    return layers.locomotion === "run" ? "run" : "walk";
  }

  if (socialActive) {
    switch (layers.social) {
      case "wave":
        return "wave";
      case "point":
        return "point";
      case "happy":
        return "happy";
      case "celebrate":
        return "celebrate";
      case "think":
        return "think";
      case "surprised":
        return "surprised";
      case "bow":
        return "bow";
      case "nod":
        return "nod";
      case "shy":
        return "shy";
      case "stretch":
        return "stretch";
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

export function applyLayerRequest(
  prev: AnimLayers,
  req: LayerRequest,
  now = Date.now(),
): AnimLayers {
  if (req.channel === "legacy") {
    const mapped = layersFromAnim(req.anim);

    if (mapped.social !== "none") {
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
      locoUntil: req.holdMs
        ? now + req.holdMs
        : mapped.locomotion === "jump"
          ? now + 450
          : 0,
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
      locoUntil: req.holdMs
        ? now + req.holdMs
        : req.anim === "jump"
          ? now + 450
          : 0,
      social: req.anim === "sleep" ? "none" : prev.social,
      socialUntil: req.anim === "sleep" ? 0 : prev.socialUntil,
    };
  }

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
    socialUntil: req.holdMs
      ? now + req.holdMs
      : req.anim === "none"
        ? 0
        : now + 1200,
  };
}

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
