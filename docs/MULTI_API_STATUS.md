# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–12 | Foundation → Home signals | Done |
| **13** | AniSkip | **Done** |
| 14 | Smart binge calculator | Next |
| 15+ | Tonight / Sauce / Themes | Queued |

## Sprint 13

- `lib/providers/aniskip.ts` — `fetchSkipTimes` / `getSkipTimes` / `estimateAverageSkipSeconds`
- MAL id required; soft-fail empty arrays
- Types: op · ed · recap · mixed (normalised `SkipInterval`)
- No UI claim of skip data until Sprint 14 binge surfaces estimates
