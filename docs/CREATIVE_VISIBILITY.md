# Animation visibility management (Creative Sprint 38)

## Goal

Do not burn GPU/CPU for invisible delight.

## Pause when

| Condition | Systems |
|-----------|---------|
| Off-screen | Rive, Lottie, R3F (demand) |
| Tab hidden (`visibilitychange`) | Rive pause, R3F `frameloop="demand"` |
| Modal closed / route inactive | Prefer unmount or `active={false}` |
| Reduced motion | Soft-fail / no continuous loops |

## Implementation

| Surface | Mechanism |
|---------|-----------|
| `lib/creative-visibility.ts` | `onPageVisibility`, `observeInView`, `shouldAnimateCreative` |
| `NexusRive` | IntersectionObserver (continuous) + page visibility → `rive.pause` |
| `NexusLottie` | In-view + page visibility gate |
| `ShelfScene` | `frameloop` demand when tab hidden or reduced motion |

## Rules

1. Prefer **pause** over teardown for quick return to view.
2. Do not run twenty off-screen Lotties or Rive instances.
3. Video (if any): same visibility rules; no Mux (gate NO).

## Related

- `docs/MEDIA_BUDGET.md`
- `lib/creative-runtime.ts`
