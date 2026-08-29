# Media performance budget (Creative Sprint 37)

## Principle

Do **not** load tool-stage creative systems on routes that do not need them.

Especially on **Home**, avoid:

- Rive Radar / Oracle instruments
- Living Shelf R3F scene
- Mux player (not integrated — gate NO)
- Many Lottie files

## Route budgets

Defined in `lib/media-budget.ts`.

| Route | maxRive | maxLottie | R3F shelf | Notes |
|-------|---------|-----------|-----------|--------|
| home | 0 | 1 | no | Discover grid only |
| browse | 0 | 0 | no | Cards + filters |
| detail | 1 | 1 | no | Trailer iframe external |
| watchlist | 0 | 0 | **yes** | Shelf when mode on |
| radar / oracle | 1 | 0 | no | Instrument only here |
| tools hub | 1 | 1 | no | Lazy per tool page |

## Tracked cost dimensions

| Dimension | Soft cap / practice |
|-----------|---------------------|
| Rive runtime | ≤1 intentional instance per tool route; pause when hidden |
| Lottie size | ~120 KB soft per file |
| Cloudinary | Named transforms; max width per route |
| Audio preload | `PRELOAD_CUES` subset; opt-in engine |
| R3F | Shelf texture + DPR from `siteBudgetFor` |
| Video | YouTube embed only; no Mux |
| Icons | Self-hosted `NexusIcon` |

## Lazy-load policy

- Living Shelf: `dynamic(..., { ssr: false })` on watchlist only
- Radar / Oracle clients: tool routes only
- Rive: `NexusRive` + IntersectionObserver (existing)

## Related

- `lib/perf-budgets.ts` — device tier for shelf
- `lib/creative-runtime.ts` — FULL / BALANCED / MINIMAL
