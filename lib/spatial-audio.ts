/**
 * Spatial audio for Living Shelf (Creative Sprint 25).
 *
 * Short positional contact + resonance resolve — no drones.
 * Disabled under reduced motion / reduced sensory.
 * Does not convey information missing from the UI.
 */

import {
  getSoundPrefs,
  isSoundUnlocked,
  playCue,
  unlockSound,
} from "./sound-engine";
import type { SoundCueId } from "./sound-manifest";

let ctx: AudioContext | null = null;
let lastSpatial = 0;
let lastResonance = 0;

const SPATIAL_COOLDOWN_MS = 90;
const RESONANCE_COOLDOWN_MS = 400;

function reducedSensory(): boolean {
  if (typeof document === "undefined") return true;
  if (document.documentElement.getAttribute("data-reduce-motion") === "true")
    return true;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return true;
  } catch {
    /* */
  }
  // Explicit sensory flag (optional future setting)
  if (document.documentElement.getAttribute("data-reduce-sensory") === "true")
    return true;
  return false;
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Map world X roughly to stereo pan −1…1 */
export function panFromShelfX(x: number): number {
  // Shelf spans about −2.8 … 4.2
  const p = x / 4.5;
  return Math.max(-0.85, Math.min(0.85, p));
}

export type SpatialPlayOpts = {
  /** Stereo pan −1 (L) … 1 (R) */
  pan?: number;
  /** Extra gain 0–1 */
  gain?: number;
};

/**
 * Play a cue with optional stereo pan (shelf contact / select).
 * Falls back to mono playCue when panner unavailable.
 */
export function playSpatialCue(
  id: SoundCueId,
  opts: SpatialPlayOpts = {},
): void {
  if (typeof window === "undefined") return;
  if (reducedSensory()) return;
  const prefs = getSoundPrefs();
  if (!prefs.enabled) return;
  if (!isSoundUnlocked()) {
    void unlockSound();
  }

  const now = Date.now();
  if (now - lastSpatial < SPATIAL_COOLDOWN_MS) return;
  lastSpatial = now;

  const pan = opts.pan ?? 0;
  if (Math.abs(pan) < 0.05) {
    playCue(id, { gain: opts.gain });
    return;
  }

  const ac = ensureCtx();
  if (!ac || ac.state === "suspended") {
    playCue(id, { gain: opts.gain });
    return;
  }

  // Lightweight synthetic tick when file path is heavy — still product voice
  try {
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const panner = ac.createStereoPanner();
    panner.pan.value = pan;
    osc.type = "sine";
    osc.frequency.value = id === "shelf_settle" ? 210 : 480;
    const peak = 0.04 * (opts.gain ?? 1) * (prefs.object ?? 1) * prefs.master;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    osc.connect(g);
    g.connect(panner);
    panner.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.07);
    // Also fire file cue quietly for body
    playCue(id, { gain: (opts.gain ?? 1) * 0.55 });
  } catch {
    playCue(id, { gain: opts.gain });
  }
}

/**
 * Brief resonance resolve when two titles are paired.
 * Higher similarity → slightly longer, more consonant interval.
 * Never a continuous drone.
 */
export function playResonanceResolve(similarity: number): void {
  if (typeof window === "undefined") return;
  if (reducedSensory()) return;
  const prefs = getSoundPrefs();
  if (!prefs.enabled) return;
  if (!isSoundUnlocked()) void unlockSound();

  const now = Date.now();
  if (now - lastResonance < RESONANCE_COOLDOWN_MS) return;
  lastResonance = now;

  const sim = Math.max(0, Math.min(1, similarity));
  const ac = ensureCtx();
  if (!ac) {
    playCue("resonance");
    return;
  }

  try {
    if (ac.state === "suspended") void ac.resume();
    const t0 = ac.currentTime;
    const dur = 0.12 + sim * 0.1;
    // Fifth when strong, minor third when weak
    const f1 = 320 + sim * 40;
    const f2 = sim > 0.55 ? f1 * 1.5 : f1 * 1.2;

    const master = ac.createGain();
    const peak =
      0.05 * (prefs.object ?? 1) * prefs.master * (0.7 + sim * 0.4);
    master.gain.setValueAtTime(0, t0);
    master.gain.linearRampToValueAtTime(peak, t0 + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    master.connect(ac.destination);

    for (const f of [f1, f2]) {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      g.gain.value = 0.5;
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    playCue("resonance", { gain: 0.45 + sim * 0.25 });
  } catch {
    playCue("resonance");
  }
}

export function spatialAudioAllowed(): boolean {
  return !reducedSensory() && getSoundPrefs().enabled;
}
