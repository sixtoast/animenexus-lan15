# Lantern-ko mascot components

## Authority

| Layer | Owns |
|--------|------|
| Director / store | why & where |
| climbing.ts | climb phases |
| runtime.ts | body pose |
| expression-pipeline.ts | face resolution |
| Actor | physics |
| CharacterRenderer | mesh |

## Debug

```js
// after installMascotDebugGlobal() in dev
__mascotDebug()
```

See `docs/mascot/SPRINT8_POLISH.md`.

## Sprint status

- [x] 1 CharacterRenderer
- [x] 2 Page world x/y
- [x] 3 MovementCommand
- [x] 4 Actor pure executor
- [x] 5 Runtime state
- [x] 6 Climb unification
- [x] 7 Expression pipeline
- [x] 8 Debug snapshot + architecture map

Architecture: `lib/mascot/architecture.ts`
