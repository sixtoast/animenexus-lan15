# Lantern-ko mascot components

## Live production path

```
MascotHost → LiveTerrain → Actor → CharacterRenderer
```

## Authority (Sprint 4)

| Layer | Owns |
|--------|------|
| Director / store | *why* and *where* (intentions, targets, MovementCommand) |
| Actor | *how* (physics, hop queue, clamp, drag) |
| CharacterRenderer | *looks* (mesh only) |

Actor **does not** schedule `nextOuting` / free-hop / random roam.

## Sprint status

- [x] Sprint 1 — CharacterRenderer
- [x] Sprint 2 — Page world x/y
- [x] Sprint 3 — MovementCommand
- [x] Sprint 4 — Actor pure executor
- [ ] Sprint 5+ — runtime state, climb system unification, …
