# Low-end device creative mode (Sprint 40)

## Tiers

Detected in `lib/creative-runtime.ts` (cores, memory, DPR, WebGL, saveData, FPS sample). Reduced motion forces **MINIMAL**.

| Capability | FULL | BALANCED | MINIMAL |
|------------|------|----------|---------|
| Rive | WebGL/Canvas | Canvas preferred | Static fallback |
| R3F (Shelf / Lantern 3D) | Yes, DPR ≤ 2 | Yes, DPR ≤ 1.5 | **2D equivalents** |
| Rich materials / cinematic | Yes | Limited | No |
| Audio (site SFX) | Yes (opt-in) | Yes (opt-in) | Allowed if not RM |
| Lottie | Yes | Yes | No |
| CSS transitions | Full | Full | Instant / opacity |

## Functionality

**Identical product actions** on all tiers — only presentation cost changes.

## Document hooks

```html
<html data-creative-tier="FULL|BALANCED|MINIMAL"
      data-creative-webgl="0|1"
      data-creative-rive="0|1"
      data-creative-rich="0|1"
      data-creative-audio="0|1">
```

## Helpers

```ts
creativeAllowsRive()
creativeAllowsR3F()
creativeR3FDprCap()
creativeAllowsLottie()
creativeAllowsAudio()
setCreativeTierOverride("MINIMAL") // dev
```

## Shelf

Living Shelf requires `creativeAllowsR3F()` and respects `creativeR3FDprCap()` on top of `siteBudgetFor`.

## Related

- `docs/MEDIA_BUDGET.md`, `docs/REDUCED_MOTION_EQUIVALENTS.md`
- `components/CreativeRuntimeProvider.tsx`
