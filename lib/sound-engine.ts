/**
 * AnimeNexus Sound Engine (Sprints 1 + 16 + 23).
 * Real AudioBuffer samples — synth fallback if WAV 404.
 */

import {
  DEFAULT_SOUND_PREFS,
  PRELOAD_CUES,
  SOUND_CUES,
  SOUND_PREF_KEY,
  type SoundCategory,
  type SoundCueId,
  type SoundPrefs,
} from "./sound-manifest";

const MAX_CONCURRENT = 5;
const lastPlayed = new Map<SoundCueId, number>();
let activeVoices = 0;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
const categoryGain = new Map<SoundCategory, GainNode>();
const buffers = new Map<SoundCueId, AudioBuffer>();
let unlocked = false;
let prefs: SoundPrefs = { ...DEFAULT_SOUND_PREFS };

function loadPrefs(): SoundPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_SOUND_PREFS };
  try {
    const raw = localStorage.getItem(SOUND_PREF_KEY);
    if (!raw) return { ...DEFAULT_SOUND_PREFS };
    return { ...DEFAULT_SOUND_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SOUND_PREFS };
  }
}

export function getSoundPrefs(): SoundPrefs {
  return { ...prefs };
}

export function setSoundPrefs(partial: Partial<SoundPrefs>): void {
  prefs = { ...prefs, ...partial };
  try {
    localStorage.setItem(SOUND_PREF_KEY, JSON.stringify(prefs));
  } catch {
    /* */
  }
  applyGains();
}

function ensureGraph(): boolean {
  if (typeof window === "undefined") return false;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    for (const cat of [
      "ui",
      "navigation",
      "object",
      "lantern",
      "tool",
      "celebration",
      "warning",
    ] as SoundCategory[]) {
      const g = ctx.createGain();
      g.connect(masterGain);
      categoryGain.set(cat, g);
    }
    applyGains();
  }
  return true;
}

function applyGains() {
  if (!masterGain || !ctx) return;
  const m = prefs.enabled ? prefs.master : 0;
  masterGain.gain.setTargetAtTime(m, ctx.currentTime, 0.02);
  for (const [cat, node] of categoryGain) {
    const v = prefs[cat] ?? 1;
    node.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
  }
}

function softDuck() {
  if (!ctx) return;
  for (const cat of ["ui", "navigation"] as SoundCategory[]) {
    const node = categoryGain.get(cat);
    if (!node) continue;
    const t = ctx.currentTime;
    node.gain.setValueAtTime(node.gain.value, t);
    node.gain.linearRampToValueAtTime(node.gain.value * 0.35, t + 0.04);
    node.gain.linearRampToValueAtTime(prefs[cat] ?? 1, t + 0.35);
  }
}

export async function unlockSound(): Promise<void> {
  if (!ensureGraph() || !ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }
  unlocked = true;
  prefs = loadPrefs();
  applyGains();
  void preloadCues(PRELOAD_CUES);
}

export function isSoundUnlocked(): boolean {
  return unlocked;
}

async function fetchBuffer(id: SoundCueId): Promise<AudioBuffer | null> {
  if (!ctx) return null;
  const existing = buffers.get(id);
  if (existing) return existing;
  const def = SOUND_CUES[id];
  try {
    const res = await fetch(def.src);
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr.slice(0));
    buffers.set(id, buf);
    return buf;
  } catch {
    return null;
  }
}

export async function preloadCues(ids: SoundCueId[]): Promise<void> {
  if (!ensureGraph()) return;
  await Promise.all(ids.map((id) => fetchBuffer(id)));
}

export type PlayOptions = {
  force?: boolean;
  gain?: number;
  pan?: number;
  playbackRate?: number;
};

function reducedAudio(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.getAttribute("data-reduce-sensory") === "true";
  } catch {
    return false;
  }
}


// A short, non-notification travel texture. It is intentionally procedural so it
// does not add an asset/download to the transition path.
export function playSpatialTravel(positionX: number, intensity = 0.35): void {
  if (reducedAudio() || !prefs.enabled || !unlocked) return;
  if (!ensureGraph() || !ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    const filter = ctx.createBiquadFilter();
    const x = Math.max(-1, Math.min(1, positionX));

    osc.type = "sine";
    osc.frequency.setValueAtTime(180 + (x + 1) * 28, now);
    osc.frequency.exponentialRampToValueAtTime(92 + (x + 1) * 18, now + 0.24);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.24);
    pan.pan.setValueAtTime(x * 0.72, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.008, intensity * 0.028),
      now + 0.025,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    const cat = categoryGain.get("navigation");
    if (!cat) return;
    osc.connect(filter).connect(gain).connect(pan).connect(cat);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // Audio is enhancement only; never allow it to affect interaction.
  }
}

export type InteractionSound =
  | "selection"
  | "navigation"
  | "discovery"
  | "watchlist"
  | "franchise";

const INTERACTION_CUES: Record<InteractionSound, SoundCueId> = {
  selection: "ui_tap",
  navigation: "nav_tick",
  discovery: "resonance",
  watchlist: "seal",
  franchise: "signal_acquired",
};

export function playInteractionSound(
  kind: InteractionSound,
  opts: PlayOptions = {},
): void {
  if (reducedAudio()) return;
  const cue = INTERACTION_CUES[kind];
  playCue(cue, { ...opts, gain: (opts.gain ?? 1) * (kind === "discovery" ? 0.72 : 0.82) });
}

export type TransitionSoundPhase = "depart" | "arrive";

/** View-transition semantic cue. Audio is enhancement-only and soft-fails. */
export function playTransitionSound(
  kind: InteractionSound,
  phase: TransitionSoundPhase,
): void {
  const cue = kind === "navigation"
    ? phase === "depart" ? "nav_tick" : "ui_confirm"
    : kind === "watchlist"
      ? "seal"
      : kind === "franchise"
        ? "signal_acquired"
        : "resonance";
  playCue(cue, { gain: phase === "depart" ? 0.5 : 0.7 });
}

export function playCue(id: SoundCueId, opts: PlayOptions = {}): void {
  if (typeof window === "undefined") return;
  if (!prefs.enabled && !opts.force) return;
  if (!unlocked && !opts.force) return;
  if (!ensureGraph() || !ctx || !masterGain) return;

  const def = SOUND_CUES[id];
  const now = Date.now();
  const cd = def.cooldownMs ?? 80;
  const last = lastPlayed.get(id) ?? 0;
  if (!opts.force && now - last < cd) return;
  if (activeVoices >= MAX_CONCURRENT) return;

  lastPlayed.set(id, now);

  if (def.category === "celebration") softDuck();

  const run = (buf: AudioBuffer) => {
    if (!ctx) return;
    const cat = categoryGain.get(def.category);
    if (!cat) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    const level = (def.gain ?? 0.4) * (opts.gain ?? 1);
    const jitter =
      def.category === "object" || def.category === "tool"
        ? 0.94 + Math.random() * 0.12
        : 1;
    g.gain.value = level * jitter;
    src.connect(g);
    if (opts.pan !== undefined && ctx) {
      const panner = ctx.createStereoPanner();
      panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, opts.pan)), ctx.currentTime, 0.015);
      g.connect(panner);
      panner.connect(cat);
    } else {
      g.connect(cat);
    }
    activeVoices += 1;
    src.onended = () => {
      activeVoices = Math.max(0, activeVoices - 1);
    };
    if (opts.playbackRate !== undefined) {
      src.playbackRate.value = Math.max(0.86, Math.min(1.14, opts.playbackRate));
    }
    try {
      src.start();
    } catch {
      activeVoices = Math.max(0, activeVoices - 1);
    }
  };

  const buf = buffers.get(id);
  if (buf) {
    run(buf);
    return;
  }
  void fetchBuffer(id).then((b) => {
    if (b) run(b);
    else synthFallback(id);
  });
}

/** When WAV is missing (404), still give a short click so UI is not silent. */
function synthFallback(id: SoundCueId) {
  if (!ctx || !masterGain) return;
  const cat = categoryGain.get(SOUND_CUES[id]?.category || "ui");
  if (!cat) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const t0 = ctx.currentTime;
    osc.type = "sine";
    osc.frequency.value = id.includes("error")
      ? 180
      : id.includes("success") || id === "complete"
        ? 520
        : 420;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    osc.connect(g);
    g.connect(cat);
    osc.start(t0);
    osc.stop(t0 + 0.08);
  } catch {
    /* */
  }
}

export function initSoundEngine(): void {
  prefs = loadPrefs();
}
