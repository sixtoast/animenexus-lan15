# Lantern-ko mascot components

## Live production path (actual)

```
MascotHost → LiveTerrain → Actor → CharacterRenderer
                                      ├── GltfCompanion (/public/mascot/companion.glb)
                                      └── LanternKoMeshV2 (procedural fallback)
```

## Coordinate system (Sprint 2)

Canonical **page world**: `x` / `y` (see `lib/mascot/world-coords.ts`)

- `screenToWorld` / `worldToScreen`
- `domRectToWorld`
- Store `position` / `target` are `WorldPoint` (`{ x, y }`)
- Legacy habitat `z` is treated as alias for `y` where still present

## Sprint status

- [x] Sprint 1 — CharacterRenderer on live Actor
- [x] Sprint 2 — Unified page world x/y
- [ ] Sprint 3 — Director drives movement commands
- [ ] Sprint 4 — Remove Actor timer AI

## Rules

1. Renderer does not decide behaviour.
2. Prefer `world-coords` over ad-hoc viewport math.
3. GLB drop-in: `public/mascot/companion.glb` with nodes `Head` + `Tip`.
