# Mascot Engine — Lantern-ko

> Personality first. Systems second.

## Sprint status

| Sprint | Focus | Status |
|--------|--------|--------|
| 1 | Identity, tastes, routine | Done |
| 2 | Thought → decision → action | Done |
| 3 | Living world / procedural motion | Done |
| 4 | UI theatre | Done |
| 5 | Relationship memory | Done |
| **6** | Utility AI goals | **Done** |
| 7 | Proactive anime guide | Next |

## Decision stack

```
Personality + Memory + World mood
        ↓
Utility AI (score goals)
        ↓
decide() thoughts on events
        ↓
execute → anim / emotion / terrain
```

## Utility scores (examples)

| Goal | Driven by |
|------|-----------|
| nap | sleepiness, energy, late-night routine |
| ponder | stress, shyness |
| seek-attention | time alone, bond stage |
| wander | boredom, curiosity, modals |
| idle | soft baseline |

Noise + hold margins stop robotic flipping.

## Memory key

`localStorage.anime_nexus_mascot_memory_v1`
