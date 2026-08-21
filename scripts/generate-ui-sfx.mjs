/**
 * Generate original short UI SFX as PCM WAV (not copyrighted anime audio).
 * Usage: node scripts/generate-ui-sfx.mjs
 * Writes to public/audio/ui/
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/audio/ui");

function writeTone(filePath, { freq = 440, ms = 40, vol = 0.12, kind = "sine", freq2 = null }) {
  const rate = 22050;
  const n = Math.floor((rate * ms) / 1000);
  const data = Buffer.alloc(n * 2);
  const attack = Math.min(0.004, (ms / 1000) * 0.2);
  const release = Math.min(0.02, (ms / 1000) * 0.5);
  const dur = ms / 1000;

  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let env = 1;
    if (t < attack) env = t / attack;
    else if (t > dur - release) env = Math.max(0, (dur - t) / release);

    let s;
    if (kind === "noise") {
      s = (((i * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
      s *= 0.35;
    } else if (kind === "click") {
      s = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 80);
      env = 1;
    } else {
      s = Math.sin(2 * Math.PI * freq * t);
      if (freq2) s = 0.6 * s + 0.4 * Math.sin(2 * Math.PI * freq2 * t);
    }
    const val = Math.max(-1, Math.min(1, s * env * vol));
    data.writeInt16LE((val * 32767) | 0, i * 2);
  }

  const header = Buffer.alloc(44);
  const dataSize = data.length;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  fs.writeFileSync(filePath, Buffer.concat([header, data]));
}

const cues = {
  ui_tap: { freq: 620, ms: 28, vol: 0.09, kind: "click" },
  nav_tick: { freq: 480, ms: 32, vol: 0.08 },
  menu_open: { freq: 320, ms: 55, vol: 0.1, freq2: 480 },
  menu_close: { freq: 400, ms: 45, vol: 0.09, freq2: 280 },
  filter_select: { freq: 520, ms: 40, vol: 0.09, freq2: 780 },
  seal: { freq: 180, ms: 90, vol: 0.14, freq2: 360 },
  remove: { freq: 220, ms: 50, vol: 0.1, freq2: 160 },
  progress_up: { freq: 440, ms: 35, vol: 0.08, freq2: 550 },
  progress_down: { freq: 380, ms: 35, vol: 0.08, freq2: 300 },
  complete: { freq: 280, ms: 120, vol: 0.12, freq2: 420 },
  error: { freq: 140, ms: 70, vol: 0.11, freq2: 110 },
  success: { freq: 360, ms: 80, vol: 0.11, freq2: 540 },
  oracle_tune: { freq: 260, ms: 100, vol: 0.1, freq2: 390 },
  radar_ping: { freq: 880, ms: 45, vol: 0.07 },
  challenge_ok: { freq: 400, ms: 90, vol: 0.12, freq2: 600 },
  challenge_bad: { freq: 160, ms: 80, vol: 0.11, freq2: 120 },
  memory_focus: { freq: 300, ms: 70, vol: 0.09, freq2: 450 },
  shelf_settle: { freq: 200, ms: 50, vol: 0.08, kind: "noise" },
  resonance: { freq: 340, ms: 85, vol: 0.1, freq2: 510 },
  modal_open: { freq: 300, ms: 50, vol: 0.09, freq2: 450 },
  modal_close: { freq: 350, ms: 45, vol: 0.08, freq2: 250 },
  signal_acquired: { freq: 420, ms: 100, vol: 0.1, freq2: 630 },
};

fs.mkdirSync(outDir, { recursive: true });
for (const [name, opts] of Object.entries(cues)) {
  writeTone(path.join(outDir, `${name}.wav`), opts);
}
console.log(`Wrote ${Object.keys(cues).length} cues → ${outDir}`);
