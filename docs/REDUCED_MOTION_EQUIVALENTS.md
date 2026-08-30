# Reduced-motion creative equivalents (Sprint 39)

## Principle

Do **not** blank the experience. Replace motion with a **static or editorial** treatment that keeps the same information and controls.

## Mapping

| Full motion | Reduced-motion equivalent |
|-------------|---------------------------|
| Rive state change | Static state frame (`RiveFallback` reason=`reduced`) |
| Lottie seal / motif | Instant graphic / OutcomeMark CSS |
| Living Shelf camera move | 2D shelf list + focus highlight (no orbit) |
| Memory room movement | Editorial timeline / chapter list |
| View Transition | Subtle opacity / instant swap |
| Seal ceremony motion | Still seal mark + optional SFX (user opt-in) |
| Spatial audio | Silent (already gated) |

## Implementation hooks

| System | Behaviour under RM |
|--------|--------------------|
| `data-reduce-motion="true"` | CSS tokens collapse; VT groups disabled |
| `NexusRive` | Does not load WASM; shows fallback |
| `NexusLottie` | `creativeAllowsLottie()` false → fallback |
| Living Shelf | Prefer `ShelfFallback` (2D) when RM |
| Micro-interactions | Transform amplitudes → 0 |

## Accessibility

- All controls remain operable (keyboard, screen reader).
- Fallbacks use `role="img"` + label when decorative state is meaningful.
- Never rely on motion alone to convey success/error (OutcomeMark + text).

## Related

- `docs/MOTION_COHESION.md`
- `docs/CREATIVE_VISIBILITY.md`
- `components/rive/RiveFallback.tsx`
