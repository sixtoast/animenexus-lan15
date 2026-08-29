/**
 * AnimeNexus UI SFX generator — mastered as one sonic language (Sprint 23).
 * Usage: node scripts/generate-ui-sfx.mjs  |  npm run generate:sfx
 *
 * Shared: 44.1 kHz mono 16-bit · consistent envelopes · category peak targets.
 * Original synthesis only — not third-party samples.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/audio/ui");

const RATE = 44100;

/** Category loudness / envelope defaults (peak ≈ linear 0–1 before encode) */
const PROFILE = {
  ui: { peak: 0.11, attack: 0.003, release: 0.018, brightness: 0.9 },
  navigation: { peak: 0.1, attack: 0.004, release: 0.022, brightness: 0.85 },
  object: { peak: 0.14, attack: 0.006, release: 0.04, brightness: 0.75 },
  tool: { peak: 0.12, attack: 0.004, release: 0.03, brightness: 0.95 },
  lantern: { peak: 0.1, attack: 0.01, release: 0.05, brightness: 0.65 },
  celebration: { peak: 0.16, attack: 0.008, release: 0.08, brightness: 0.8 },
  warning: { peak: 0.13, attack: 0.005, release: 0.045, brightness: 0.55 },
};

function softClip(x) {
  const a = 1.2;
  return Math.tanh(x * a) / Math.tanh(a);
}

/**
 * @param {string} filePath
 * @param {object} opts
 * @param {keyof typeof PROFILE} opts.cat
 */
function writeTone(
  filePath,
  {
    cat = "ui",
    freq = 440,
    ms = 40,
    kind = "sine",
    freq2 = null,
    peakScale = 1,
  },
) {
  const profile = PROFILE[cat] || PROFILE.ui;
  const peak = profile.peak * peakScale;
  const attack = profile.attack;
  const release = Math.min(profile.release, (ms / 1000) * 0.55);
  const dur = ms / 1000;
  const n = Math.max(1, Math.floor(RATE * dur));
  const data = Buffer.alloc(n * 2);
  const bright = profile.brightness;

  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let env = 1;
    if (t < attack) env = t / attack;
    else if (t > dur - release) env = Math.max(0, (dur - t) / release);

    let s;
    if (kind === "noise") {
      // Deterministic soft noise (not pure white)
      const r =
        ((i * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1;
      s = r * 0.28 + Math.sin(2 * Math.PI * freq * t) * 0.12;
    } else if (kind === "click") {
      s = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 90);
      env = 1;
    } else if (kind === "chime") {
      s =
        0.55 * Math.sin(2 * Math.PI * freq * t) +
        0.3 * Math.sin(2 * Math.PI * (freq2 || freq * 1.5) * t) +
        0.15 * Math.sin(2 * Math.PI * freq * 2 * t) * Math.exp(-t * 12);
    } else {
      s = Math.sin(2 * Math.PI * freq * t);
      if (freq2) s = 0.62 * s + 0.38 * Math.sin(2 * Math.PI * freq2 * t);
    }

    // Mild brightness tilt (high freqs attenuated when brightness < 1)
    if (bright < 1 && kind !== "noise") {
      s *= 0.7 + 0.3 * bright;
    }

    const val = softClip(s * env * peak);
    data.writeInt16LE((val * 32767) | 0, i * 2);
  }

  const header = Buffer.alloc(44);
  const dataSize = data.length;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  fs.writeFileSync(filePath, Buffer.concat([header, data]));
}

/**
 * Mastered cue table — one product voice.
 * Ordinary UI stays short/quiet; celebration/object richer; warning darker.
 */
const cues = {
  ui_tap: { cat: "ui", freq: 640, ms: 26, kind: "click", peakScale: 0.85 },
  nav_tick: { cat: "navigation", freq: 500, ms: 30 },
  menu_open: { cat: "navigation", freq: 340, ms: 52, freq2: 510 },
  menu_close: { cat: "navigation", freq: 420, ms: 44, freq2: 290 },
  filter_select: { cat: "ui", freq: 540, ms: 36, freq2: 760 },
  seal: { cat: "object", freq: 190, ms: 95, freq2: 380, kind: "chime" },
  remove: { cat: "object", freq: 230, ms: 48, freq2: 165 },
  progress_up: { cat: "object", freq: 450, ms: 32, freq2: 560 },
  progress_down: { cat: "object", freq: 390, ms: 32, freq2: 310 },
  complete: {
    cat: "celebration",
    freq: 300,
    ms: 140,
    freq2: 450,
    kind: "chime",
  },
  error: { cat: "warning", freq: 150, ms: 75, freq2: 115 },
  success: { cat: "ui", freq: 380, ms: 72, freq2: 570, kind: "chime" },
  oracle_tune: { cat: "tool", freq: 270, ms: 95, freq2: 405, kind: "chime" },
  radar_ping: { cat: "tool", freq: 900, ms: 42, peakScale: 0.9 },
  challenge_ok: { cat: "tool", freq: 420, ms: 85, freq2: 630, kind: "chime" },
  challenge_bad: { cat: "warning", freq: 170, ms: 78, freq2: 125 },
  memory_focus: { cat: "lantern", freq: 310, ms: 80, freq2: 465 },
  shelf_settle: { cat: "object", freq: 210, ms: 55, kind: "noise", peakScale: 0.75 },
  resonance: { cat: "object", freq: 350, ms: 90, freq2: 525, kind: "chime" },
  modal_open: { cat: "navigation", freq: 310, ms: 48, freq2: 460 },
  modal_close: { cat: "navigation", freq: 360, ms: 42, freq2: 260 },
  signal_acquired: {
    cat: "tool",
    freq: 440,
    ms: 105,
    freq2: 660,
    kind: "chime",
  },
};

fs.mkdirSync(outDir, { recursive: true });
for (const [name, opts] of Object.entries(cues)) {
  writeTone(path.join(outDir, `${name}.wav`), opts);
}
console.log(
  `Mastered ${Object.keys(cues).length} cues @ ${RATE} Hz → ${outDir}`,
);
