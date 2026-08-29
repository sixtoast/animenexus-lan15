# Motion cohesion (Creative Sprint 35)

## Goal

Rive, dotLottie, CSS, View Transitions, and R3F share **one pacing language**.

## Categories

| Category | Duration band | Feel | Examples |
|----------|---------------|------|----------|
| **Immediate** | ~90–120 ms | Confirm the press | Button press, nav tick, icon active |
| **Responsive** | ~180–220 ms | UI answered | Card hover settle, filter chip, modal edge |
| **Deliberate** | ~400–450 ms | Meaningful change | Seal, progress fill, room enter |
| **Cinematic** | ~700–900 ms | Scene shift | Memory-room emphasis, view transition root, shelf camera |

## Token map

| Category | CSS tokens |
|----------|------------|
| Immediate | `--ix-fast`, `--motion-immediate` |
| Responsive | `--ix-standard` / `--dur-fast`, `--motion-responsive` |
| Deliberate | `--ix-deliberate` / `--dur`, `--motion-deliberate` |
| Cinematic | `--dur-slow`, `--motion-cinematic` |

## Technology mapping

| Tech | How to stay cohesive |
|------|----------------------|
| CSS | Use `--ix-*` / `--motion-*` only |
| View Transitions | Root fade ≤ cinematic; cover swap deliberate |
| Rive | State changes feel immediate–responsive; avoid long idle loops competing with CSS |
| dotLottie | `playbackRate` from `motionPlaybackRate(category)` — no arbitrary 0.5×/2× |
| R3F | Camera/settling in deliberate–cinematic; micro lifts immediate |

## Lottie / Rive speed

Do not ship authored files with speeds unrelated to the site. Prefer:

```ts
import { motionPlaybackRate } from "@/lib/motion-categories";
// Immediate → 1.15, Responsive → 1, Deliberate → 0.92, Cinematic → 0.85
```

## Reduced motion

All bands collapse to ~1 ms under `data-reduce-motion` / system reduce (unless `data-motion="full"`).

## Related

- `app/micro-interactions.css`, `app/motion.css`
- `lib/motion-categories.ts`
