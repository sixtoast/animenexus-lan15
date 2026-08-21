# Awwwards programme — performance baseline (Sprint 0)

## Status

**Measured numbers are not yet captured in this environment** (no local Lighthouse / WebGL FPS harness on the agent).

This document defines **what to measure**, **where it will live**, and **constraints future sprints must not violate**. Fill the tables after a production or `next build && next start` pass on a reference device.

## Reference conditions

- Build: `npm run build` / Vercel production
- Browser: Chromium latest, desktop 1440×900 + mobile 390×844
- Network: simulated 4G for LCP notes; cable for FPS
- Mascot: enabled (default)
- Reduced motion: off for “full” row; on for “reduced” row

## Core Web Vitals (fill)

| Metric | Home | Browse | Detail | Watchlist | Tools/Oracle | Notes |
|--------|------|--------|--------|-----------|--------------|-------|
| LCP (ms) | — | — | — | — | — | |
| CLS | — | — | — | — | — | |
| INP (ms) | — | — | — | — | — | |

## Bundle (fill from `.next` analyze or Vercel)

| Route / chunk | First-load JS (kB) | Notes |
|---------------|--------------------|-------|
| Shared | — | |
| `/` | — | |
| `/browse` | — | |
| `/watchlist` | — | |
| `/tools/oracle` | — | |
| Mascot / three (if split) | — | Must stay lazy |

## Runtime (fill)

| Metric | Value | Notes |
|--------|-------|-------|
| Avg FPS (Home, mascot on) | — | 30s sample |
| Avg FPS (Watchlist) | — | |
| JS heap after 5-route tour | — | Home→Browse→Detail→Watchlist→Journey |
| WebGL context count | — | Expect **1** (mascot) |
| Three.js scene object count (mascot idle) | — | |

## Known cost centres (code audit)

1. **Mascot R3F canvas** — continuous `useFrame` when mounted; must support pause when tab hidden / reduced motion / hide companion.
2. **Global CSS volume** — many CSS files imported in root layout (programme Sprint 22 consolidates).
3. **Home** — client islands: greeting, ritual, dashboard, quote cycle, cards.
4. **AniList** — network bound; LCP depends on poster images (`AnimeImage` + remotePatterns).

## Hard constraints for later sprints

| Rule | Rationale |
|------|-----------|
| Basic browse/seal works with **0 WebGL** | Signature 3D is optional |
| Prefer **one** WebGL canvas | Avoid multi-context GPU cost |
| Lazy-load Living Shelf / heavy scenes | Keep first-load JS stable |
| Cap DPR on mid/low tiers | Sprint 18 adaptive quality |
| No continuous full-page `backdrop-filter` animation | CPU/GPU |
| Cinematography must not cause global React re-renders of the tree on hover | Store + CSS variables / data attributes |

## How to measure (maintainer)

```bash
npm run build && npm start
# Chrome DevTools → Performance / Lighthouse
# Optional: @next/bundle-analyzer
```

Update this file when numbers exist; do not invent metrics.
