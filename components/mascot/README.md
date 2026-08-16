# Lantern-ko mascot components

## Live production path (actual)

```
MascotHost → LiveTerrain → Actor → CharacterRenderer
                                      ├── GltfCompanion
                                      └── LanternKoMeshV2
```

## Brain → body (Sprint 3)

```
Director / store / UI
  → MovementCommand (lib/mascot/movement-command.ts)
  → Actor hop queue / steer
  → bodyRef (runtime pose)
```

Actor also follows `store.target` when present.
Ambient roam is suppressed while a command is active.

## Coordinates (Sprint 2)

Canonical page world `x` / `y` — `lib/mascot/world-coords.ts`

## Sprint status

- [x] Sprint 1 — CharacterRenderer
- [x] Sprint 2 — Unified x/y
- [x] Sprint 3 — MovementCommand channel
- [ ] Sprint 4 — Remove Actor timer AI
