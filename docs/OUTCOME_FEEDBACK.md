# Success / error micro-feedback (Creative Sprint 8)

## Rules

1. **Never** show success before the operation confirms.
2. Error marks only appear when a real failure is presented (`SignalError`, toast tone, button `error`).
3. Accessible text stays primary; marks are presentation (`aria-hidden`).

## Pieces

| Piece | Role |
|-------|------|
| `OutcomeMark` | Rive/CSS ✓ / ! mark |
| `useAsyncOutcome` | `begin` → `markSuccess` / `markError` / `track(promise)` |
| `Button` `success` / `error` | Existing props (Sprint 4) |
| Toast `tone: "success" \| "error"` | Optional; backward compatible |

## Toast API

```ts
showToast("Saved"); // neutral
showToast("Sealed", { tone: "success", emoji: "✓" });
showToast("Could not save", { tone: "error" });
// Legacy still works:
showToast("Hello", "👋", false);
```

## Asset

`public/rive/outcome-mark.riv` (optional).
