# Loading quality pass (Creative Sprint 41)

## Goal

Intentional transitions between skeleton → image → Rive / Lottie / 3D. Avoid blank canvas, FOUC, layout shift, late icon swap, and long spinner stalls.

## Rules

1. **Reserve space** — poster slots use `aspect-ratio: 2/3` (or explicit size) before media arrives.
2. **Skeleton matches layout** — same grid/columns as final content.
3. **Soft resolve** — `.anime-img--wait` → `.anime-img--in` opacity (no hard pop).
4. **Theatre, not infinite spin** — `LoadingTheater` + `LoadingSymbol` for route/tool waits; phase copy from `lib/loading-theatre`.
5. **Preload sparingly** — only assets likely used soon (SFX `PRELOAD_CUES`, priority posters).
6. **Reduced motion** — skip shimmer/stagger; keep opacity 1.

## Surfaces

| Surface | Treatment |
|---------|-----------|
| Grid posters | `PosterSkeleton` + `AnimeImage` aspect |
| Buttons | `btn-spinner` replaces leading; width stable |
| Tools | Theatre phases + labeled spinner |
| Rive/Lottie | Fallback occupies same box (`width`/`height`) |
| Shelf | Staging label until canvas ready |

## Related

- `app/load-choreography.css`, `app/loading-quality.css`
- `components/PosterSkeleton.tsx`, `components/LoadingTheater.tsx`
