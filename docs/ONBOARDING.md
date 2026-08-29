# Onboarding illustrations (Creative Sprint 11)

## Goal

Explain Seal, Resonance, Living Shelf, Oracle, Journey, Radar **in context** — not a forced carousel.

## API

```ts
import { FeatureTip } from "@/components/FeatureTip";
import { clearOnboardingSeen } from "@/lib/onboarding-seen";

<FeatureTip feature="oracle" />
// Help replay:
clearOnboardingSeen("oracle");
// or clearOnboardingSeen() for all
```

## Seen state

`localStorage` key `animenexus.onboarding.seen.v1`.

## Art

`NexusLottie` accepts optional `.lottie` paths under `public/lottie/`.  
Missing files → glyph fallback. No second animation library required until assets exist.

## Rules

- No autoplay-heavy tutorial wall
- Dismiss once; allow Help replay
- Product remains usable if tips never show
