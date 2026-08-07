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
import { chooseBehaviour, type MascotGoal } from "./behaviour";
import {
  decayEmotions as decayFn,
  defaultEmotions,
  motionFromEmotions,
  type MotionProfile,
} from "./emotions";
import { screenToHabitatTarget } from "./ui-registry";
import { decide, decideAmbient } from "./decision";
import { executeDecision } from "./execute";

type MascotState = {
  enabled: boolean;
  anim: MascotAnim;
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

function ctxFromStore() {
  const s = useMascotStore.getState();
  return {
    emotions: s.emotions,
    msSinceInteract: Date.now() - s.lastInteractionAt,
  };
}

export const useMascotStore = create<MascotState>((set, get) => ({
  enabled: true,
  anim: "idle",
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
  setEnabled: (v) => set({ enabled: v }),
  setAnim: (a) => set({ anim: a }),
  requestAnim: (req) => {
    const { anim, busyUntil } = get();
    if (Date.now() < busyUntil && !req.force) return false;
    if (!canInterrupt(anim, req.anim, req.force)) return false;
    set({
      anim: req.anim,
      busyUntil: req.holdMs ? Date.now() + req.holdMs : get().busyUntil,
    });
    if (req.holdMs) {
      const token = req.anim;
      window.setTimeout(() => {
        if (get().anim === token) {
          const ambient = preferredAmbient(get().emotions, !!get().target);
          set({ anim: ambient });
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

    // Decision layer ambient pass
    if (!s.loadingSince && Date.now() > s.busyUntil) {
      const ambient = decideAmbient(ctxFromStore());
      if (ambient && Math.random() < 0.45) {
        set({ lastThought: ambient.thought.text });
        executeDecision(ambient);
        set({ nextThinkAt: Date.now() + 8000 });
        return;
      }
    }

    if (s.loadingSince) {
      const waited = Date.now() - s.loadingSince;
      if (waited > 12_000 && s.anim !== "sleep") {
        s.requestAnim({ anim: "sleep" });
        set({ nextThinkAt: Date.now() + 8000 });
        return;
      }
      if (waited > 4_000) {
        s.requestAnim({ anim: "think", holdMs: 3000 });
        set({ nextThinkAt: Date.now() + 4000 });
        return;
      }
    }
    const busy = Date.now() < s.busyUntil;
    const decision = chooseBehaviour(s.emotions, {
      msSinceInteract: Date.now() - s.lastInteractionAt,
      currentGoal: s.goal,
      busy,
    });
    if (!decision) {
      set({ nextThinkAt: Date.now() + 2000 });
      return;
    }
    if (decision.goal === s.goal && decision.goal !== "wander") {
      set({ nextThinkAt: Date.now() + decision.cooldownMs });
      return;
    }
    s.applyGoal(decision.goal);
    set({ nextThinkAt: Date.now() + decision.cooldownMs });
  },
  requestWander: () => {
    get().applyGoal("wander");
  },
  dispatch: (e) => {
    const { bumpEmotion, requestAnim, applyGoal } = get();

    const runDecision = (
      kind: "pet" | "drag" | "seal" | "complete" | "idle-long" | "route",
    ) => {
      const d = decide(kind, ctxFromStore());
      set({ lastThought: d.thought.text, lastInteractionAt: Date.now() });
      executeDecision(d);
      set({ nextThinkAt: Date.now() + 3500 });
    };

    switch (e.type) {
      case "tick": {
        const { busyUntil, anim, emotions } = get();
        if (Date.now() < busyUntil) break;
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
            set({ goal: "idle" });
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
          }
        }
        break;
      case "error":
        set({ context: "error" });
        bumpEmotion("stress", 0.2);
        bumpEmotion("confidence", -0.08);
        requestAnim({ anim: "surprised", holdMs: 900, force: true });
        set({ nextThinkAt: Date.now() + 2500 });
        break;
      case "empty-list":
        set({ context: "empty-list" });
        bumpEmotion("curiosity", 0.08);
        bumpEmotion("boredom", 0.05);
        requestAnim({ anim: "think", holdMs: 2500 });
        break;
      case "context":
        set({ context: e.context });
        break;
      case "theme":
        bumpEmotion("curiosity", 0.05);
        requestAnim({ anim: "wave", holdMs: 600 });
        break;
      case "scroll-fast":
        bumpEmotion("stress", 0.1);
        if (Date.now() > get().busyUntil) {
          requestAnim({ anim: "surprised", holdMs: 500, force: true });
        }
        break;
      case "jump":
        set({ jumpQueued: true });
        requestAnim({ anim: "jump", holdMs: 450, force: true });
        bumpEmotion("energy", 0.05);
        break;
      case "notice-ui":
        bumpEmotion("curiosity", 0.06);
        bumpEmotion("attention", 0.04);
        if (get().emotions.curiosity > 0.5 && Date.now() > get().busyUntil) {
          requestAnim({ anim: "point", holdMs: 1400 });
        }
        break;
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
        });
        if (Date.now() > get().busyUntil && Math.random() < 0.4) {
          set({ target: t, goal: "wander" });
          requestAnim({ anim: "walk" });
        } else {
          requestAnim({ anim: "point", holdMs: 900 });
        }
        break;
      }
      case "click":
      case "pet":
        runDecision("pet");
        if (get().anim === "sleep") {
          requestAnim({ anim: "surprised", holdMs: 500, force: true });
        }
        set({ jumpQueued: true });
        break;
      case "seal":
        runDecision("seal");
        set({ jumpQueued: true });
        break;
      case "complete":
        runDecision("complete");
        set({ jumpQueued: true });
        break;
      case "go-to": {
        if (get().anim === "sleep") {
          requestAnim({ anim: "surprised", holdMs: 500, force: true });
        }
        const t = clampToHabitat(e.x, e.z);
        set({ target: t, goal: "wander" });
        requestAnim({ anim: "walk", force: true });
        bumpEmotion("curiosity", 0.05);
        break;
      }
      case "climb": {
        const t = clampToHabitat(e.x, e.z);
        set({ target: t, goal: "wander", jumpQueued: true });
        requestAnim({ anim: "jump", holdMs: 500, force: true });
        bumpEmotion("energy", 0.08);
        bumpEmotion("curiosity", 0.06);
        break;
      }
      case "drag": {
        const t = clampToHabitat(e.x, e.z);
        set({ position: t, target: null });
        runDecision("drag");
        break;
      }
      case "idle-long":
        runDecision("idle-long");
        break;
      case "route":
        runDecision("route");
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
