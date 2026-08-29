/**
 * Lantern-ko procedural audio (Sprints 19 + 26 foley).
 *
 * Tiny oscillators only — no external assets.
 * Magical/social cues + sparse physical foley (step, cloth, land, hop, object).
 * Off by default. Event-driven and heavily throttled — not every micro-move.
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
  | "sad"
  /** Object interaction (desk / landmark touch) */
  | "object";

let ctx: AudioContext | null = null;
let enabled = false;
let volume = 0.7;
let lastCueAt = 0;
/** Global floor between any two cues */
const MIN_GAP_MS = 110;
const lastByKind = new Map<string, number>();
/** Walk steps only every Nth anim cue */
let walkStepCounter = 0;

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
  f2?: number;
  /** Per-kind min gap ms — foley is aggressive */
  gapMs?: number;
  /** Soft noise burst under the tone (cloth / land) */
  noise?: boolean;
};

/**
 * Foley profiles stay quiet; magical cues can be slightly brighter.
 * Footsteps are sparse (high gapMs + walk counter).
 */
const PROFILES: Record<CueKind, CueProfile> = {
  pet: { f: 520, dur: 0.12, type: "sine", peak: 0.04 },
  point: { f: 660, dur: 0.1, type: "triangle", peak: 0.03 },
  seal: { f: 380, dur: 0.18, type: "sine", peak: 0.045, f2: 570 },
  hop: { f: 290, dur: 0.07, type: "square", peak: 0.022, gapMs: 280 },
  think: { f: 440, dur: 0.15, type: "sine", peak: 0.02 },
  footstep: {
    f: 150,
    dur: 0.045,
    type: "triangle",
    peak: 0.014,
    gapMs: 480,
    noise: true,
  },
  land: {
    f: 110,
    dur: 0.1,
    type: "sine",
    peak: 0.028,
    f2: 85,
    gapMs: 350,
    noise: true,
  },
  cloth: {
    f: 880,
    dur: 0.055,
    type: "triangle",
    peak: 0.01,
    gapMs: 550,
    noise: true,
  },
  "ui-tap": { f: 720, dur: 0.06, type: "sine", peak: 0.025 },
  chirp: { f: 780, dur: 0.1, type: "sine", peak: 0.035, f2: 980 },
  surprise: { f: 480, dur: 0.12, type: "square", peak: 0.03, f2: 720 },
  sleepy: { f: 210, dur: 0.24, type: "sine", peak: 0.018, gapMs: 900 },
  wave: { f: 560, dur: 0.11, type: "sine", peak: 0.028, f2: 700 },
  sad: { f: 300, dur: 0.2, type: "triangle", peak: 0.02 },
  object: {
    f: 340,
    dur: 0.07,
    type: "sine",
    peak: 0.02,
    f2: 510,
    gapMs: 320,
  },
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

function softNoise(ac: AudioContext, dur: number, peak: number, now: number) {
  const n = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.35));
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const gain = ac.createGain();
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1200;
  gain.gain.value = peak * volume * 0.35;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start(now);
  src.stop(now + dur + 0.01);
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
  if (p.noise) softNoise(ac, p.dur * 0.9, p.peak, now);

  lastCueAt = nowMs;
  lastByKind.set(kind, nowMs);
}

/** Map locomotion / social anim → optional cue (sparse). */
export function cueForAnim(anim: MascotAnim): CueKind | null {
  switch (anim) {
    case "walk":
      // Only every 3rd walk tick — not a continuous march
      walkStepCounter += 1;
      return walkStepCounter % 3 === 0 ? "footstep" : null;
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

/** Event-level cues — preferred entry for physical foley */
export function playEventCue(
  event:
    | "pet"
    | "seal"
    | "complete"
    | "land"
    | "ui-tap"
    | "drag"
    | "error"
    | "object"
    | "hop",
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
    case "object":
      playCue("object");
      break;
    case "hop":
      playCue("hop");
      break;
  }
}
