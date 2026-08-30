# Visual regression (Creative Sprint 49)

Creative changes cause subtle regressions. Capture **reference** states and re-check after UI work.

## Reference routes

| State | Path | Notes |
|-------|------|-------|
| Home | `/` | Hero + grid |
| Browse | `/browse` | Filters + cards |
| Detail | `/anime/{id}` | Pick a stable public id |
| Watchlist Manage | `/watchlist` | Manage mode |
| Living Shelf | `/watchlist` (Shelf mode) | 3D or 2D fallback |
| Taste | `/tools/taste` or `/taste` | Data-led |
| Journey | `/journey` | Editorial |
| Radar | `/tools/radar` | Instrument |
| Oracle | `/tools/oracle` | Broadcast |
| Sauce | `/tools/sauce` | Dropzone |
| Challenge | `/tools/challenge` | Game |
| Account | `/account` | Auth panels |
| Session cover | `/tools/session-cover` | Export studio |
| Showcase | `/showcase` | Cinematic tour |

## Variants

- **Viewport:** desktop (1280×800), mobile (390×844)
- **Theme:** `data-theme` default dark; light if toggled
- **Motion:** full vs `data-reduce-motion=true`
- **Creative tier:** optional FULL vs MINIMAL (localStorage override)

## Process

1. Capture baseline PNGs into `docs/visual-baselines/` (git-lfs optional) or external album.
2. After creative sprints, re-capture and diff (manual or Playwright).
3. Fail criteria: broken layout, missing chrome, CLS, wrong theme, empty critical panels.

## Automation (optional)

```bash
# List routes for a screenshot tool
npm run visual:routes
```

Playwright visual compare can be added later; this sprint establishes the **matrix** so diffs are intentional.

## Related

- `scripts/visual-routes.mjs`
