# Lantern-ko mascot components

## Live production path (actual)

```
MascotHost → LiveTerrain → Actor → CharacterRenderer
                                      ├── GltfCompanion (/public/mascot/companion.glb)
                                      └── LanternKoMeshV2 (procedural fallback)
```

## Sprint 1 status

- [x] `CharacterRenderer` — no AI, render-only
- [x] Live `Actor` uses `CharacterRenderer` (inline mesh removed)
- [ ] Director still does not drive Actor movement (Sprint 3–4)
- [ ] Actor still owns outing/roam timers (Sprint 4)

## Rules

1. Renderer does not decide behaviour.
2. Actor currently still decides outing (temporary until Sprint 4).
3. GLB drop-in: `public/mascot/companion.glb` with nodes `Head` + `Tip`.
