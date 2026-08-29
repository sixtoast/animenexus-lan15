# Radar instrument (Creative Sprint 5)

## Component

`components/rive/RadarInstrument.tsx`

## Phase → Rive map

| Radar phase | Rive state | Meaning |
|-------------|------------|---------|
| idle | idle | Standby |
| scanning | loading | Calibrating / sweep start |
| signal | attention | Request in flight |
| identify | loading | Processing contacts |
| result | complete | Data set — real success only |
| error | error | Fetch failed |

Optional number input `band` 0–5 from contact count (log scale).

## Timing

Scan phases advance with **real** fetch/work. Fixed theatre delays removed.

## Accessibility

Horizon results remain HTML list links. Instrument is `aria-hidden` presentation.

## Asset

`public/rive/radar-instrument.riv` (optional). Without it, CSS fallback ring/sweep shows.
