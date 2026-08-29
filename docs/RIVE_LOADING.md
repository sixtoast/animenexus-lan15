# Loading symbols (Creative Sprint 7)

## Component

`components/rive/LoadingSymbol.tsx`

## Where

- `LoadingTheater` — global calm wait overlay
- `PosterSkeleton` — compact mark

## Phase → Rive

| Theatre phase | Meaning | Rive |
|---------------|---------|------|
| 0 | Tuning signal | loading |
| 1 | Listening for catalogue | attention |
| 2 | Resolving | loading |

Phases advance on a timer **only while** a real `loadingStart` is pending (existing theatre). No fake percent bars.

## Accessibility

Parent keeps `role="status"` + label + phase text. Symbol is `aria-hidden`.

## Fallback

Missing `.riv` or MINIMAL tier → SignalBars + CSS ring.

## Asset

`public/rive/loading-symbol.riv` (optional).
