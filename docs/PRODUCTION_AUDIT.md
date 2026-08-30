# Production bundle audit (Creative Sprint 54)

## Checklist

- [x] `npm run build` (types + production compile)
- [ ] Lighthouse (mobile + desktop) on Home / Browse / Watchlist
- [ ] Core Web Vitals (LCP, INP, CLS) on production URL
- [ ] GPU / memory while Living Shelf open
- [ ] Mobile real device + slow 3G throttle
- [ ] Cold load vs repeat load

Do **not** accept “fine on my desktop.”

## Build snapshot (local, Sprint 54)

- Next.js 15.5.7 production build **passed** after NexusRive type fix.
- Shared First Load JS ≈ **102 kB**.
- Notable route weights (First Load JS):
  - `/watchlist` ≈ **365 kB** (R3F/shelf — expected; lazy scene)
  - `/tools/fanzone` ≈ **189 kB**
  - `/browse` ≈ **160 kB**
  - `/tools/radar` ≈ **151 kB**
  - `/showcase` ≈ **106 kB** (light)

## Follow-ups

1. Keep shelf/R3F out of Home (already).
2. Consider further code-splitting fanzone if CWV regresses.
3. Upgrade Next when patched (npm warned 15.5.7 security advisory — track upstream).

## Related

- `docs/MEDIA_BUDGET.md`, `docs/LOW_END_CREATIVE.md`
