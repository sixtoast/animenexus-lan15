# Sprint 7 — Expression pipeline

## New modules

- `lib/mascot/expression-pipeline.ts` — `resolveExpression`, `ExpressionKey`
- `lib/mascot/anim-priority.ts` — channel priority / interrupt helpers
- `components/mascot/expression-bridge.ts` — `faceForActor(anim, emotions, socialActive)`

## Wire in Actor (one-line swap)

Replace:

```ts
const expression = expressionFromAnim(
  anim,
  expressionFromEmotions(emotions),
);
```

With:

```ts
import { faceForActor } from "./expression-bridge";

const expression = faceForActor(
  anim,
  emotions,
  layers.social !== "none",
);
```

Pass `expression` into `CharacterRenderer` as today.

## Priority order

1. Climb phase face (jump/grab/sit/fall)
2. Social gesture anim (wave, point, surprised, …)
3. Locomotion (jump, land, sleep, walk)
4. Emotion baseline
