# Lantern-ko mascot components

## Authority

| Layer | Owns |
|--------|------|
| Director / store | why & where |
| `runtime.ts` | live body pose (x/y/phase/platform) |
| Actor | physics execution |
| CharacterRenderer | mesh only |

## Sprint status

- [x] 1 CharacterRenderer
- [x] 2 Page world x/y
- [x] 3 MovementCommand
- [x] 4 Actor pure executor
- [x] 5 Runtime state + intention→landmark targets
- [ ] 6 Climb system unification
