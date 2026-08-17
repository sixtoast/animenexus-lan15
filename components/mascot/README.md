# Lantern-ko mascot components

## Authority

| Layer | Owns |
|--------|------|
| Director / store | why & where |
| `climbing.ts` | climb phases (brain-issued) |
| `runtime.ts` | live body pose |
| Actor | physics execution |
| CharacterRenderer | mesh only |

## Climb (Sprint 6)

One path only:

```
intention / UI interact
  → pickClimbTarget (safe + on-screen)
  → executeClimb phases
  → each phase issues MovementCommand (page x/y)
  → Actor executes hops
```

No second Actor climb AI.

## Sprint status

- [x] 1–5 Character, coords, commands, executor, runtime
- [x] 6 Climb system unification
- [ ] 7 Expression / anim layer cleanup (optional)
