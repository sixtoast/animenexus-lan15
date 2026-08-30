# Success hierarchy (Creative Sprint 47)

| Tier | Example | Treatment |
|------|---------|-----------|
| **Micro** | Saved note | Neutral toast, no SFX, no seal |
| **Action** | Added to watchlist | Small seal + quiet object SFX |
| **Major** | Completed title | Story Closed / complete cue |
| **Milestone** | Journey/taste event | Longer hold + complete |

## Rules

1. Never play success fanfare for ordinary clicks or micro saves.
2. `OutcomeMark` success only after confirmed async result.
3. Use `treatmentForSuccess(tier)` when wiring new flows.

## Related

- `lib/success-tier.ts`
- `SealMomentHost`, `ToastProvider`
