/**
 * Soft procedural cues for Lantern-ko (Sprint M8).
 * Off by default. No external assets — tiny oscillators only.
 */

export type CueKind = "pet" | "point" | "seal" | "hop" | "think";

let ctx: AudioContext | null = null;
let enabled = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function isAudioEnabled() {
  return enabled;
}

export function setAudioEnabled(v: boolean) {
  enabled = v;
  try {
    localStorage.setItem("anime_nexus_mascot_audio", v ? "on" : "off");
  } catch {
    /* */
  }
}

export function loadAudioPref() {
  try {
    enabled = localStorage.getItem("anime_nexus_mascot_audio") === "on";
  } catch {
    enabled = false;
  }
  return enabled;
}

export function playCue(kind: CueKind) {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);

  const profiles: Record<
    CueKind,
    { f: number; dur: number; type: OscillatorType; peak: number }
  > = {
    pet: { f: 520, dur: 0.12, type: "sine", peak: 0.04 },
    point: { f: 660, dur: 0.1, type: "triangle", peak: 0.03 },
    seal: { f: 380, dur: 0.18, type: "sine", peak: 0.045 },
    hop: { f: 280, dur: 0.08, type: "square", peak: 0.025 },
    think: { f: 440, dur: 0.15, type: "sine", peak: 0.02 },
  };
  const p = profiles[kind];
  osc.type = p.type;
  osc.frequency.setValueAtTime(p.f, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(80, p.f * 0.7), now + p.dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(p.peak, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);
  osc.start(now);
  osc.stop(now + p.dur + 0.02);
}
