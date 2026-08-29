/**
 * AnimeNexus Sound Engine (Sprints 1 + 16 + 23).
 * Real AudioBuffer samples — not runtime oscillator beeps as primary path.
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

/** Brief duck of UI/nav when a celebration cue fires */
function softDuck() {
  if (!ctx) return;
  for (const cat of ["ui", "navigation"] as SoundCategory[]) {
    const node = categoryGain.get(cat);
    if (!node) continue;
    const base = prefs[cat] ?? 1;
    const t = ctx.currentTime;
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(node.gain.value, t);
    node.gain.linearRampToValueAtTime(base * 0.35, t + 0.04);
    node.gain.linearRampToValueAtTime(base, t + 0.35);
  }
}

/** Must run from a user gesture. */
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
};

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
    g.connect(cat);
    activeVoices += 1;
    src.onended = () => {
      activeVoices = Math.max(0, activeVoices - 1);
    };
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
  });
}

export function initSoundEngine(): void {
  prefs = loadPrefs();
}
