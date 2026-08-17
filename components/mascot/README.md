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

## Expression (Sprint 7)

```
anim + emotions + climbPhase
  → resolveExpression() / faceForActor()
  → ExpressionKey
  → CharacterRenderer / GltfCompanion
```

Priority: climb face → social gesture → locomotion → emotion baseline.

## Sprint status

- [x] 1–6 Character, coords, commands, executor, runtime, climb
- [x] 7 Expression / anim priority pipeline
- [ ] 8 Polish / debug / remaining audit items
