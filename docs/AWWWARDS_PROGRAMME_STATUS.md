# Awwwards Signature Experience — programme status

| Sprint | Name | Status |
|--------|------|--------|
| 0–13 | Baseline → loading theatre | Done |
| **14** | Shared-element choreography | **Done** |
| 15 | Performance pass | Next |
| 16+ | Mobile QA → final | Queued |

## Sprint 14

- Cover name `cover-{id}` already on cards / shelf / detail via `AnimeImage`
- `withViewTransition` never blocks navigation if API missing
- CSS: 0.48s ease-out-expo morph; root fade; reduced-motion kills groups
- Contract documented in `lib/view-transition.ts`
