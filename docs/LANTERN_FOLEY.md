# Lantern foley (Creative Sprint 26)

## Goal

Sparse physical presence for Lantern-ko without a footstep on every pixel of motion.

## Layers

| Layer | Examples | Notes |
|-------|----------|--------|
| **Foley** | `footstep`, `land`, `cloth`, `hop`, `object`, `sleepy` | Quiet, noise-softened, high `gapMs` |
| **Magical / social** | `pet`, `seal`, `chirp`, `think`, `wave` | Keep synthetic identity |

## Throttling

- Global min gap **110 ms** between any cues
- Footsteps: **480 ms** per-kind + only every **3rd** walk anim tick
- Cloth / drag: **550 ms**
- Sleep: **900 ms**

## API

```ts
import { playAnimCue, playEventCue, playCue } from "@/lib/mascot/audio";

playAnimCue("walk");        // may no-op (sparse)
playEventCue("land");
playEventCue("object");     // landmark / desk touch
playEventCue("drag");       // cloth shift
```

## Rules

1. Event-driven — prefer `playEventCue` over continuous emitters.
2. Reduced motion → silence.
3. Mascot audio remains **opt-in** (separate from site Sound Settings).
4. No external sample packs required.
