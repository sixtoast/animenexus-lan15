/**
 * Sprint 19 — Soft procedural audio for Lantern-ko
 *
 * Tiny oscillators only — no external assets.
 * Off by default. Respects mascot mute, reduced motion, and low volume.
 */

import type { MascotAnim } from "./types";

export type CueKind =
  | "pet"
  | "point"
  | "seal"
  | "hop"
  | "think"
  | "footstep"
  | "land"
  | "cloth"
  | "ui-tap"
  | "chirp"
  | "surprise"
  | "sleepy"
  | "wave"
  | "sad";

let ctx: AudioContext | null = null;
let enabled = false;
let volume = 0.7;
let lastCueAt = 0;
const MIN_GAP_MS = 90;
const lastByKind = new Map<string, number>();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function isAudioEnabled() {
  return enabled;
}

export function getAudioVolume() {
  return volume;
}

export function setAudioEnabled(v: boolean) {
  enabled = v;
  try {
    localStorage.setItem("anime_nexus_mascot_audio", v ? "on" : "off");
  } catch {
    /* */
  }
}

export function setAudioVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  try {
    localStorage.setItem("anime_nexus_mascot_audio_vol", String(volume));
  } catch {
    /* */
  }
}

export function loadAudioPref() {
  try {
    enabled = localStorage.getItem("anime_nexus_mascot_audio") === "on";
    const vol = localStorage.getItem("anime_nexus_mascot_audio_vol");
    if (vol != null) volume = Math.max(0, Math.min(1, Number(vol) || 0.7));
  } catch {
    enabled = false;
  }
  return enabled;
}

type CueProfile = {
  f: number;
  dur: number;
  type: OscillatorType;
  peak: number;
  /** Optional second partial */
  f2?: number;
  /** Per-kind min gap ms */
  gapMs?: number;
};

const PROFILES: Record<CueKind, CueProfile> = {
  pet: { f: 520, dur: 0.12, type: "sine", peak: 0.04 },
  point: { f: 660, dur: 0.1, type: "triangle", peak: 0.03 },
  seal: { f: 380, dur: 0.18, type: "sine", peak: 0.045, f2: 570 },
  hop: { f: 280, dur: 0.08, type: "square", peak: 0.025 },
  think: { f: 440, dur: 0.15, type: "sine", peak: 0.02 },
  footstep: { f: 160, dur: 0.05, type: "triangle", peak: 0.018, gapMs: 220 },
  land: { f: 120, dur: 0.09, type: "sine", peak: 0.03, f2: 90 },
  cloth: { f: 900, dur: 0.06, type: "triangle", peak: 0.012, gapMs: 400 },
  "ui-tap": { f: 720, dur: 0.06, type: "sine", peak: 0.025 },
  chirp: { f: 780, dur: 0.1, type: "sine", peak: 0.035, f2: 980 },
  surprise: { f: 480, dur: 0.12, type: "square", peak: 0.03, f2: 720 },
  sleepy: { f: 220, dur: 0.22, type: "sine", peak: 0.022 },
  wave: { f: 560, dur: 0.11, type: "sine", peak: 0.028, f2: 700 },
  sad: { f: 300, dur: 0.2, type: "triangle", peak: 0.02 },
};

function tone(
  ac: AudioContext,
  f: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  now: number,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(f, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(60, f * 0.72), now + dur);
  const p = peak * volume;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, p), now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

/** Play a soft cue. No-op when muted, reduced-motion, or spamming. */
export function playCue(kind: CueKind) {
  if (!enabled) return;
  if (prefersReducedMotion()) return;
  if (volume <= 0.01) return;

  const nowMs = Date.now();
  if (nowMs - lastCueAt < MIN_GAP_MS) return;
  const p = PROFILES[kind];
  const gap = p.gapMs ?? 120;
  const last = lastByKind.get(kind) ?? 0;
  if (nowMs - last < gap) return;

  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();

  const now = ac.currentTime;
  tone(ac, p.f, p.dur, p.type, p.peak, now);
  if (p.f2) tone(ac, p.f2, p.dur * 0.85, "sine", p.peak * 0.55, now + 0.01);

  lastCueAt = nowMs;
  lastByKind.set(kind, nowMs);
}

/** Map locomotion / social anim → optional cue (sparse). */
export function cueForAnim(anim: MascotAnim): CueKind | null {
  switch (anim) {
    case "walk":
      return "footstep";
    case "jump":
      return "hop";
    case "point":
      return "point";
    case "think":
      return "think";
    case "wave":
      return "wave";
    case "happy":
      return "chirp";
    case "surprised":
      return "surprise";
    case "sleep":
      return "sleepy";
    default:
      return null;
  }
}

/** Call when anim changes (throttle inside playCue). */
export function playAnimCue(anim: MascotAnim) {
  const kind = cueForAnim(anim);
  if (kind) playCue(kind);
}

/** Event-level cues */
export function playEventCue(
  event:
    | "pet"
    | "seal"
    | "complete"
    | "land"
    | "ui-tap"
    | "drag"
    | "error",
) {
  switch (event) {
    case "pet":
      playCue("pet");
      break;
    case "seal":
    case "complete":
      playCue("seal");
      break;
    case "land":
      playCue("land");
      break;
    case "ui-tap":
      playCue("ui-tap");
      break;
    case "drag":
      playCue("cloth");
      break;
    case "error":
      playCue("surprise");
      break;
  }
}
