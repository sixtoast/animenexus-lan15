# Creative runtime (Sprint 1)

## Module

`lib/creative-runtime.ts` + `components/CreativeRuntimeProvider.tsx`

## Tiers

| Tier | Intent |
|------|--------|
| **FULL** | WebGL R3F + Rive WebGL path + rich motion + audio |
| **BALANCED** | WebGL allowed with DPR cap; Rive OK; limited concurrent heavy effects |
| **MINIMAL** | No extra Rive/Lottie/WebGL creative; CSS + static fallbacks; product still works |

Reduced motion (`data-reduce-motion` / MotionProvider) **always** forces **MINIMAL** for creative extras.

## Signals (no UA string as primary)

- WebGL presence + software renderer blacklist (SwiftShader / llvmpipe)
- `hardwareConcurrency`
- `devicePixelRatio`
- viewport min dimension
- `navigator.connection.saveData`
- optional measured FPS (`sampleFrameStability`)

## Document attributes

| Attribute | Values |
|-----------|--------|
| `data-creative-tier` | FULL \| BALANCED \| MINIMAL |
| `data-creative-webgl` | 0 \| 1 |
| `data-creative-rive` | 0 \| 1 |
| `data-creative-audio` | 0 \| 1 |
| `data-creative-rich` | 0 \| 1 |

## Helpers

- `creativeAllowsR3F()` / `creativeR3FDprCap()`
- `creativeAllowsRive()` / `creativeAllowsLottie()` / `creativeAllowsAudio()`
- `setCreativeTierOverride('BALANCED' | null)` for QA

## Next

Sprint 2 installs Rive infrastructure gated by `creativeAllowsRive()`.
