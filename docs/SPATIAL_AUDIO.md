# Spatial audio — Living Shelf (Creative Sprint 25)

## Goal

Sound supports spatial interaction without becoming a second UI.

## Behaviours

| Event | Sound |
|-------|--------|
| Object select / contact | Soft positional tick (`playSpatialCue`) |
| Resonance pair | Short resolving dyad (`playResonanceResolve`) |
| Hover / scroll | Silent |

## Rules

1. **No drones** — every tone has a short envelope and stops.
2. **No exclusive information** — pan and resolve only reinforce visible state.
3. **Reduced sensory** — `data-reduce-motion` or `data-reduce-sensory` disables spatial layer entirely.
4. Still respects Sound Settings opt-in.

## API

```ts
import { playSpatialCue, playResonanceResolve, panFromShelfX } from "@/lib/spatial-audio";

playSpatialCue("shelf_settle", { pan: panFromShelfX(x) });
playResonanceResolve(0.72); // similarity 0–1
```
