# Cloudinary visual consistency (Creative Sprint 43)

## Goal

Every site-owned asset uses the **right** transform — aspect, crop, DPR, format, quality — with no double-optimisation or 4K-at-300px waste.

## Named transforms (`lib/media/cloudinary.ts`)

| Name | Size | Aspect | Crop |
|------|------|--------|------|
| `nexus-card` | 360×540 | 2:3 | `g_auto` |
| `nexus-hero` | 960×540 | 16:9 | `g_auto` |
| `nexus-avatar` | 96×96 | 1:1 | `g_face` + round |
| `nexus-session-cover` | 1200×630 | OG | `g_auto` |
| `nexus-thumbnail` | 160×240 | 2:3 | `g_auto` |
| `nexus-social` | 1200×630 | OG | `g_auto` |
| `nexus-sauce-preview` | ≤720 | limit | no forced crop |

All include `q_auto,f_auto` (and `dpr_auto` where display scales).

## Rules

1. **Cloudinary owns optimise** — `image-strategy` returns owner `cloudinary` → Next/Image must not re-compress (`unoptimized` or pass-through).
2. **Match display size** — card grid uses `nexus-card` / width ≤ media budget (`lib/media-budget.ts`).
3. **Hero sharpness** — `nexus-hero` at ≥960w; never serve thumbnail as hero.
4. **CLS** — parent always sets `aspect-ratio` before load (Sprint 41).
5. **Focal** — subject-aware gravity via `lib/media/crop.ts` when override needed (`g_auto:subject`).
6. **No duplicates** — one publicId + named transform; avoid parallel raw URLs.

## AniList posters

External CDN images stay on Next/Image optimise path — not forced through Cloudinary unless ingested.

## Checklist

- [ ] Card posters 2:3 stable
- [ ] No blurry full-bleed from 160w thumbs
- [ ] OG/session cover 1200×630
- [ ] Sauce preview `c_limit` not aggressive fill
- [ ] Console named transforms mirror code strings

## Related

- `docs/IMAGE_OPTIMISATION.md`, `docs/CROP.md`, `docs/MEDIA_BUDGET.md`
