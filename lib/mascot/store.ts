import { create } from "zustand";
import type {
  MascotAnim,
  MascotContext,
  MascotEmotions,
  MascotEvent,
} from "./types";
import {
  clampToHabitat,
  randomWanderTarget,
  type NavTarget,
} from "./navigation";
import {
  canInterrupt,
  preferredAmbient,
  shouldWake,
  type AnimRequest,
} from "./anim-machine";
import {
  applyLayerRequest,
  DEFAULT_LAYERS,
  resolveAnim,
  type AnimLayers,
} from "./anim-layers";
import { type MascotGoal } from "./behaviour";
import {
  decayEmotions as decayFn,
  defaultEmotions,
  motionFromEmotions,
  type MotionProfile,
} from "./emotions";
import { screenToHabitatTarget } from "./ui-registry";
import { executeDecision } from "./execute";
import {
  directorAmbient,
  directorOnEvent,
  type MascotIntention,
  type DirectorWorld,
} from "./director";
import { traitCursorEngageChance } from "./personality";
import { notePage, noteSessionStart } from "./memory";

type MascotState = {
  enabled: boolean;
  anim: MascotAnim;
  layers: AnimLayers;
  intention: MascotIntention;
  lastDirectorReason: string | null;
  goal: MascotGoal;
  context: MascotContext;
  busyUntil: number;
  nextThinkAt: number;
  emotions: MascotEmotions;
  lastInteractionAt: number;
  lastThought: string | null;
  position: NavTarget;
  target: NavTarget | null;
  lookBias: { x: number; y: number };
  jumpQueued: boolean;
  loadingSince: number | null;
  sessionNoted: boolean;
  setEnabled: (v: boolean) => void;
  setAnim: (a: MascotAnim) => void;
  requestAnim: (req: AnimRequest) => boolean;
  setPosition: (p: NavTarget) => void;
  setTarget: (t: NavTarget | null) => void;
  bumpEmotion: (key: keyof MascotEmotions, delta: number) => void;
  decayEmotions: (dtSec: number) => void;
  motionProfile: () => MotionProfile;
  dispatch: (e: MascotEvent) => void;
  requestWander: () => void;
  applyGoal: (goal: MascotGoal) => void;
  runBehaviourTick: () => void;
  consumeJump: () => boolean;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));

function worldFromStore(): DirectorWorld {
  const s = useMascotStore.getState();
  return {
    emotions: s.emotions,
    context: s.context,
    msSinceInteract: Date.now() - s.lastInteractionAt,
    currentGoal: s.goal,
    currentIntention: s.intention,
    busy: Date.now() < s.busyUntil,
    hasTarget: !!s.target,
    loading: !!s.loadingSince,
  };
}

function commitLayers(layers: AnimLayers) {
  return {
    layers,
    anim: resolveAnim(layers),
  };
}

export const useMascotStore = create<MascotState>((set, get) => ({
  enabled: true,
  anim: "idle",
  layers: { ...DEFAULT_LAYERS },
  intention: "idle",
  lastDirectorReason: null,
  goal: "idle",
  context: "idle",
  busyUntil: 0,
  nextThinkAt: 0,
  emotions: defaultEmotions(),
  lastInteractionAt: Date.now(),
  lastThought: null,
  position: { x: 0, z: 0 },
  target: null,
  lookBias: { x: 0, y: 0 },
  jumpQueued: false,
  loadingSince: null,
  sessionNoted: false,
  setEnabled: (v) => set({ enabled: v }),
  setAnim: (a) => {
    const layers = applyLayerRequest(get().layers, {
      channel: "legacy",
      anim: a,
      force: true,
    });
    set(commitLayers(layers));
  },
  requestAnim: (req) => {
    const { anim, busyUntil, layers } = get();
    if (Date.now() < busyUntil && !req.force) return false;
    if (!canInterrupt(anim, req.anim, req.force)) return false;

    const socialGestures: MascotAnim[] = [
      "wave",
      "point",
      "happy",
      "think",
      "surprised",
    ];
    const isSocial = socialGestures.includes(req.anim);
    const next = applyLayerRequest(layers, {
      channel: "legacy",
      anim: req.anim,
      holdMs: req.holdMs,
      force: req.force,
    });
    if (isSocial && (layers.locomotion === "walk" || layers.locomotion === "run")) {
      next.locomotion = layers.locomotion;
    }

    set({
      ...commitLayers(next),
      busyUntil: req.holdMs ? Date.now() + req.holdMs : get().busyUntil,
    });

    if (req.holdMs) {
      const token = req.anim;
      window.setTimeout(() => {
        if (get().anim === token || get().layers.social !== "none") {
          const ambient = preferredAmbient(get().emotions, !!get().target);
          const cleared = applyLayerRequest(get().layers, {
            channel: "legacy",
            anim: ambient,
            force: true,
          });
          set(commitLayers(cleared));
        }
      }, req.holdMs);
    }
    return true;
  },
  setPosition: (p) => set({ position: p }),
  setTarget: (t) => set({ target: t }),
  bumpEmotion: (key, delta) =>
    set((s) => ({
      emotions: {
        ...s.emotions,
        [key]: clamp(s.emotions[key] + delta),
      },
    })),
  decayEmotions: (dtSec) => {
    set((s) => ({ emotions: decayFn(s.emotions, dtSec) }));
  },
  motionProfile: () => motionFromEmotions(get().emotions),
  consumeJump: () => {
    if (!get().jumpQueued) return false;
    set({ jumpQueued: false });
    return true;
  },
  applyGoal: (goal) => {
    const { requestAnim, anim, emotions } = get();
    set({ goal });
    switch (goal) {
      case "wander": {
        const t = randomWanderTarget();
        set({ target: t });
        if (emotions.energy > 0.7 && Math.random() < 0.25) {
          set({ jumpQueued: true });
          requestAnim({ anim: "jump", holdMs: 500, force: true });
        } else {
          requestAnim({ anim: "walk" });
        }
        break;
      }
      case "nap":
        set({ target: null });
        requestAnim({ anim: "sleep" });
        break;
      case "ponder":
        set({ target: null });
        requestAnim({ anim: "think", holdMs: 5000 });
        break;
      case "seek-attention":
        set({ target: clampToHabitat(0, 0.18) });
        requestAnim({ anim: "walk", force: true });
        window.setTimeout(() => {
          if (get().goal === "seek-attention") {
            requestAnim({ anim: "wave", holdMs: 1200, force: true });
          }
        }, 900);
        break;
      case "celebrate":
        set({ target: null, jumpQueued: true });
        requestAnim({ anim: "jump", holdMs: 400, force: true });
        window.setTimeout(() => {
          requestAnim({ anim: "happy", holdMs: 900, force: true });
        }, 380);
        break;
      case "idle":
      default:
        if (anim === "walk" && !get().target) {
          requestAnim({ anim: "idle" });
        }
        break;
    }
  },
  runBehaviourTick: () => {
    const s = get();
    if (!s.enabled) return;
    if (Date.now() < s.nextThinkAt) return;

    const directive = directorAmbient(worldFromStore());
    if (!directive) {
      set({ nextThinkAt: Date.now() + 2000 });
      return;
    }

    set({
      intention: directive.intention,
      lastDirectorReason: directive.reason,
    });

    if (directive.decision) {
      set({ lastThought: directive.decision.thought.text });
      executeDecision(directive.decision, get);
      set({ nextThinkAt: Date.now() + directive.cooldownMs });
      return;
    }

    if (directive.goal && directive.goal !== s.goal) {
      s.applyGoal(directive.goal);
    } else if (directive.goal === s.goal && directive.goal === "wander") {
      s.applyGoal("wander");
    }

    set({ nextThinkAt: Date.now() + directive.cooldownMs });
  },
  requestWander: () => {
    get().applyGoal("wander");
  },
  dispatch: (e) => {
    const { bumpEmotion, requestAnim } = get();

    // Sprint 7 — session bookkeeping once per page load
    if (!get().sessionNoted && typeof window !== "undefined") {
      noteSessionStart();
      set({ sessionNoted: true });
    }

    const runDirected = (
      kind:
        | "pet"
        | "drag"
        | "seal"
        | "complete"
        | "idle-long"
        | "route",
    ) => {
      const directive = directorOnEvent(kind, worldFromStore());
      set({
        intention: directive.intention,
        lastDirectorReason: directive.reason,
        lastInteractionAt: Date.now(),
      });
      if (directive.decision) {
        set({ lastThought: directive.decision.thought.text });
        executeDecision(directive.decision, get);
      } else if (directive.goal) {
        get().applyGoal(directive.goal);
      }
      set({ nextThinkAt: Date.now() + directive.cooldownMs });
    };

    switch (e.type) {
      case "tick": {
        const { busyUntil, anim, emotions, layers } = get();
        if (Date.now() < busyUntil) break;
        if (
          layers.social !== "none" &&
          layers.socialUntil > 0 &&
          Date.now() >= layers.socialUntil
        ) {
          const cleared = applyLayerRequest(layers, {
            channel: "social",
            anim: "none",
            force: true,
          });
          set(commitLayers(cleared));
        }
        if (
          anim === "happy" ||
          anim === "wave" ||
          anim === "surprised" ||
          anim === "point" ||
          anim === "jump"
        )
          break;
        if (anim === "sleep" && !get().loadingSince) {
          if (shouldWake(emotions, false)) {
            requestAnim({ anim: "idle" });
            set({ goal: "idle", intention: "idle" });
          }
          break;
        }
        get().runBehaviourTick();
        break;
      }
      case "loading":
        if (e.active) {
          set({
            loadingSince: get().loadingSince ?? Date.now(),
            context: "loading",
            intention: "observe",
            lastDirectorReason: "loading — observe",
          });
          bumpEmotion("curiosity", 0.05);
          bumpEmotion("attention", 0.08);
          requestAnim({ anim: "think", holdMs: 2000 });
        } else {
          const was = get().loadingSince;
          set({ loadingSince: null });
          if (was) {
            bumpEmotion("happiness", 0.06);
            requestAnim({ anim: "wave", holdMs: 700 });
            set({ intention: "greet", lastDirectorReason: "load done — greet" });
          }
        }
        break;
      case "error": {
        const d = directorOnEvent("error", worldFromStore());
        set({
          context: "error",
          intention: d.intention,
          lastDirectorReason: d.reason,
        });
        bumpEmotion("stress", 0.2);
        bumpEmotion("confidence", -0.08);
        requestAnim({ anim: "surprised", holdMs: 900, force: true });
        set({ nextThinkAt: Date.now() + d.cooldownMs });
        break;
      }
      case "empty-list": {
        const d = directorOnEvent("empty-list", worldFromStore());
        set({
          context: "empty-list",
          intention: d.intention,
          lastDirectorReason: d.reason,
        });
        bumpEmotion("curiosity", 0.08);
        bumpEmotion("boredom", 0.05);
        requestAnim({ anim: "think", holdMs: 2500 });
        set({ nextThinkAt: Date.now() + d.cooldownMs });
        break;
      }
      case "context":
        set({ context: e.context });
        break;
      case "theme":
        bumpEmotion("curiosity", 0.05);
        requestAnim({ anim: "wave", holdMs: 600 });
        set({ intention: "greet", lastDirectorReason: "theme change" });
        break;
      case "scroll-fast":
        bumpEmotion("stress", 0.1);
        if (Date.now() > get().busyUntil) {
          requestAnim({ anim: "surprised", holdMs: 500, force: true });
          set({ intention: "hide", lastDirectorReason: "fast scroll" });
        }
        break;
      case "jump":
        set({ jumpQueued: true, intention: "play" });
        requestAnim({ anim: "jump", holdMs: 450, force: true });
        bumpEmotion("energy", 0.05);
        break;
      case "notice-ui": {
        const d = directorOnEvent("notice-ui", worldFromStore());
        set({ intention: d.intention, lastDirectorReason: d.reason });
        bumpEmotion("curiosity", 0.06);
        bumpEmotion("attention", 0.04);
        if (get().emotions.curiosity > 0.5 && Date.now() > get().busyUntil) {
          requestAnim({ anim: "point", holdMs: 1400 });
        }
        break;
      }
      case "ui-hover": {
        bumpEmotion("curiosity", 0.04);
        bumpEmotion("attention", 0.06);
        const hz = screenToHabitatTarget(e.clientX, e.clientY);
        const t = clampToHabitat(hz.x * 0.85, hz.z);
        set({
          lookBias: {
            x: (e.clientX / window.innerWidth - 0.5) * 2,
            y: (e.clientY / window.innerHeight - 0.5) * 2,
          },
          intention: "interact-ui",
          lastDirectorReason: "ui hover",
        });
        if (
          Date.now() > get().busyUntil &&
          Math.random() < traitCursorEngageChance()
        ) {
          set({ target: t, goal: "wander" });
          requestAnim({ anim: "walk" });
        } else {
          requestAnim({ anim: "point", holdMs: 900 });
        }
        break;
      }
      case "click":
      case "pet":
        runDirected("pet");
        if (get().anim === "sleep") {
          requestAnim({ anim: "surprised", holdMs: 500, force: true });
        }
        set({ jumpQueued: true });
        break;
      case "seal":
        runDirected("seal");
        set({ jumpQueued: true });
        break;
      case "complete":
        runDirected("complete");
        set({ jumpQueued: true });
        break;
      case "go-to": {
        if (get().anim === "sleep") {
          requestAnim({ anim: "surprised", holdMs: 500, force: true });
        }
        const t = clampToHabitat(e.x, e.z);
        set({
          target: t,
          goal: "wander",
          intention: "explore",
          lastDirectorReason: "go-to",
        });
        requestAnim({ anim: "walk", force: true });
        bumpEmotion("curiosity", 0.05);
        break;
      }
      case "climb": {
        const t = clampToHabitat(e.x, e.z);
        set({
          target: t,
          goal: "wander",
          jumpQueued: true,
          intention: "investigate",
          lastDirectorReason: "climb",
        });
        requestAnim({ anim: "jump", holdMs: 500, force: true });
        bumpEmotion("energy", 0.08);
        bumpEmotion("curiosity", 0.06);
        break;
      }
      case "drag": {
        const t = clampToHabitat(e.x, e.z);
        set({ position: t, target: null });
        runDirected("drag");
        break;
      }
      case "idle-long":
        runDirected("idle-long");
        break;
      case "route":
        // Sprint 7 — remember path (no query/PII)
        if (e.path) notePage(e.path);
        runDirected("route");
        break;
      default:
        break;
    }
  },
}));

export function mascotNotify(e: MascotEvent) {
  if (typeof window === "undefined") return;
  useMascotStore.getState().dispatch(e);
}
