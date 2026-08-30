# Runtime failure testing (Creative Sprint 51)

Creative tech is **progressive enhancement**. Core product must keep working when extras fail.

## Failure → expected behaviour

| Failure | Behaviour |
|---------|-----------|
| **Rive `.riv` missing / WASM fail** | `NexusRive` → `RiveFallback` / error boundary; controls outside stay usable |
| **Lottie src 404** | `NexusLottie` HEAD probe fails → static fallback |
| **Cloudinary unconfigured / down** | `buildCloudinaryUrl` null → callers use catalogue CDN / Next Image |
| **Iconify CDN** | Not used at runtime — `NexusIcon` local SVG / glyph |
| **WebGL lost / unavailable** | Living Shelf → `ShelfFallback` 2D; mascot tiers degrade |
| **Audio blocked / autoplay** | `playCue` no-ops until unlock; no thrown errors |
| **Mux** | Not integrated (gate NO) — no dependency |
| **Spline** | Lab-only docs — no production embed |

## Manual simulations

1. Block `*.riv` in DevTools → Radar/Oracle instrument shows fallback.
2. Clear `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` → site-owned URLs skip Cloudinary path.
3. `setCreativeTierOverride("MINIMAL")` → no Rive/R3F extras.
4. Deny autoplay / never gesture → silent UI.
5. Disable WebGL in browser flags → shelf list mode.

## Rule

If creative fails, **browse, seal, tools, and account still work**.

## Related

- `docs/LOW_END_CREATIVE.md`, `docs/MEDIA_BUDGET.md`, `docs/MUX_EVALUATION.md`
