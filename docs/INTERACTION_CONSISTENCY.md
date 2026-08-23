# Interaction consistency (Sprint 15)

## Rules

1. **Timing** — only three bands: `--ix-fast` (90), `--ix-standard` (200), `--ix-deliberate` (420).
2. **Easings** — spring (seal/celebrate only), expo (enter/nav), soft (release/hover exit).
3. **Amplitude** — routine motion ≤ 8px; scale ≤ ~1.03 unless deliberate reveal.
4. **Press** — 1px down + 0.985 scale on `.btn` active globally.
5. **Sound** — only after confirmed mutation; never hover spam; opt-in.
6. **Reduced motion** — `data-reduce-motion` collapses all bands to 1ms.

## Prefer

| Need | Use |
|------|-----|
| Press | `.ix-press` or global `.btn:active` |
| Hover lift | `.ix-hover` |
| Select | `.ix-select` |
| Reveal | `.ix-reveal` |
| Progress width | `.ix-progress` or `--ix-trans-deliberate` |
| Success/error | `.ix-success` / `.ix-error` + cues |

## Avoid

- One-off `transition: 0.3s ease`
- Hover SFX on cards/nav
- Continuous counters
- Full-screen seal on every progress tick

## Migrated surfaces (0–14)

Button · Card · Nav · Browse · Load · Watchlist · Seal · Detail · Oracle · Radar · Taste · Challenge · Account
