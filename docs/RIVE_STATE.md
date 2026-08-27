# Rive interaction state convention (Sprint 3)

## Vocabulary

| State | Meaning |
|-------|---------|
| `idle` | Rest |
| `hover` | Pointer/focus over control |
| `pressed` | Active pointer down / key activate |
| `loading` | Real in-flight request |
| `success` | Operation confirmed OK |
| `error` | Operation failed |
| `disabled` | Control not available |
| `attention` | Soft highlight, not success |
| `complete` | Durable finished flow |

Optional instrument input: number `band` (0–5) via `applyRiveBand`.

## Priority

`disabled > loading > error > complete > success > attention > pressed > hover > idle`

## Hard rules

1. **API succeeds → then** set `success` (use `markSuccess` / `runTracked`).
2. Never fire success on click alone.
3. Keyboard focus uses the same hover/pressed path as pointer.
4. Reduced motion / creative MINIMAL → no Rive; CSS button still works.

## Code

```ts
const { runTracked, bindBridge, pointerHandlers, state } = useRiveAppState();

await runTracked(() => fetchRadar());
// Rive enters loading, then success or error from real outcome
```

```tsx
<RiveButtonShell
  src="/rive/btn-oracle.riv"
  loading={busy}
  success={ok}
  error={!!err}
  onClick={onAsk}
>
  Ask
</RiveButtonShell>
```

`.riv` artboards should expose booleans named exactly after the vocabulary (exclusive) or triggers of the same names.
