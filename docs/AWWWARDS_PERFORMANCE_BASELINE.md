# Awwwards programme — performance baseline

## Sprint 15 pass (code)

Implemented without inventing Lighthouse numbers:

| Control | Implementation |
|---------|----------------|
| Lazy WebGL shelf | `dynamic(() => ShelfScene, { ssr: false })` |
| Mobile prefers 2D shelf | `shelfPreferFallback` in `lib/perf-budgets.ts` |
| Texture count cap | 12–40 by tier; message when capped |
| Shelf DPR / AA | From site budget into `ShelfScene` |
| Mascot tiers | Existing `lib/mascot/performance.ts` |
| Core UI without WebGL | Manage mode + fallback always available |

## Still measure on device (fill later)

| Metric | Home | Browse | Detail | Watchlist | Notes |
|--------|------|--------|--------|-----------|-------|
| LCP (ms) | — | — | — | — | |
| CLS | — | — | — | — | |
| INP (ms) | — | — | — | — | |
| FPS (mascot on) | — | — | — | — | 30s sample |
| WebGL contexts | — | — | — | — | Expect ≤2 (mascot + optional shelf) |

## Hard constraints

- Browse / seal works with **0 WebGL**
- Prefer **≤2** WebGL canvases (mascot + shelf when open)
- No continuous full-page `backdrop-filter` animation
- Cinematography via store + `data-cinema-*` — not whole-tree re-renders on hover
