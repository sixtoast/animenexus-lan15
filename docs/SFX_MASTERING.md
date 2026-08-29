# SFX mastering (Creative Sprint 23)

## Goal

One designed sonic language — not a grab-bag of unrelated samples.

## Shared technical profile

| Parameter | Value |
|-----------|--------|
| Sample rate | **44100 Hz** |
| Channels | Mono |
| Bit depth | 16-bit PCM |
| Soft clip | `tanh` peak control |
| Location | `public/audio/ui/*.wav` |

## Category profiles

| Category | Peak (rel.) | Attack | Release | Brightness | Feel |
|----------|-------------|--------|---------|------------|------|
| **UI** | 0.11 | 3 ms | 18 ms | high | Quiet ordinary clicks |
| **Navigation** | 0.10 | 4 ms | 22 ms | med-high | Soft route / menu |
| **Object** | 0.14 | 6 ms | 40 ms | warmer | Seal, shelf, progress |
| **Tool** | 0.12 | 4 ms | 30 ms | crisp | Radar, oracle, sauce |
| **Lantern** | 0.10 | 10 ms | 50 ms | soft | Memory focus |
| **Celebration** | 0.16 | 8 ms | 80 ms | rich | Complete |
| **Warning** | 0.13 | 5 ms | 45 ms | dark | Error, challenge_bad |

## Rules

1. Ordinary clicks stay **extremely quiet** (`ui_tap` peakScale 0.85).
2. Major events use **chime** partials (seal, complete, success).
3. Warning cues sit **lower** in pitch and brightness.
4. Regenerate after profile changes: `npm run generate:sfx`.

## Engine

Runtime category gains still apply (`lib/sound-engine.ts`). Mastering here is the **file** language; prefs remain user opt-in.

## Next

Sprint 24 wires these cues into every micro-interaction surface.
