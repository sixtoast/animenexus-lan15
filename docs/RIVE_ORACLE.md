# Oracle frequency instrument (Creative Sprint 6)

## Component

`components/rive/OracleInstrument.tsx`

## AI state → Rive (discrete only)

| Oracle flags | `aiState` | Rive |
|--------------|-----------|------|
| default | idle | idle |
| `tuning` | thinking | loading |
| `locked` after success | complete | complete |
| catch path | failed | error |

No per-token animation. One visual change when the response locks in.

## Mode → band

`ORACLE_MODES` index 0–5 → number input `band` (needle position in CSS fallback).

Modes stay real `role="tab"` buttons.

## Asset

`public/rive/oracle-instrument.riv` (optional).
