# Animation visibility management (Creative Sprint 38)

## Goal

Do not burn GPU cycles for invisible delight.

## Pause when

| Condition | Systems |
|-----------|---------|
| Off-screen (IO) | Rive, Lottie, R3F |
| Tab hidden (`visibilitychange`) | Rive, Lottie, R3F frameloop |
| Modal closed | Any instrument inside modal |
| Route inactive | Unmount / dynamic unload |

## Implementation

| System | Behaviour |
|--------|-----------|
| **NexusRive** | IntersectionObserver + `document.hidden` → `rive.pause()` |
| **NexusLottie** | IO; only play when intersecting |
| **Living Shelf** | Canvas `frameloop="demand"` when tab hidden or reduced motion |
| **Video** | YouTube embeds only — browser pauses background tabs |

Shared helpers: `lib/creative-visibility.ts`.

## Related

- `lib/media-budget.ts` — do not mount heavy systems on Home
- `lib/creative-runtime.ts` — device tier
