# Session Cover social quality (Creative Sprint 44)

## Principle

Do **not** stretch one composition into every ratio. Each export size gets an intentional layout bias.

## Ratios (`COVER_SIZES`)

| Key | Size | Platform intent |
|-----|------|-----------------|
| `story` | 1080×1920 | Instagram / TikTok story |
| `portrait` | 1080×1350 | Instagram portrait post |
| `square` | 1080×1080 | Instagram / Discord square |
| `x` | 1600×900 | X / Twitter image |
| `landscape` | 1920×1080 | Generic landscape / Discord wide |
| `og` | 1200×630 | Open Graph / link preview |
| `mobile` | 1080×1920 | Mobile save (same as story, labeled) |

## Composition bias

| Ratio | Bias |
|-------|------|
| Story / mobile | Tall stack: title top, art middle, stats bottom third |
| Portrait | Balanced vertical with poster column |
| Square | Centre-weighted title + optional single poster |
| X / landscape | Wide: title left, art band right |
| OG | Link-preview safe margins; no edge-critical text |

## Studio UX

`SessionCoverStudio` exposes ratio buttons with platform labels. Preview before download.

## Related

- `lib/session-cover.ts`
- `components/SessionCoverStudio.tsx`
